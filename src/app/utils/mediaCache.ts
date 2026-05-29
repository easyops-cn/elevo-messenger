import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from './matrix';
import { FALLBACK_MIMETYPE, mimeTypeToExt } from './mimeTypes';

export type CachedMediaRequest = {
  mediaUrl: string;
  mimeType: string;
  encInfo?: EncryptedAttachmentInfo;
  cacheVariant?: string;
  createdAt?: number;
};

export type CachedMediaEntry = {
  key: string;
  relativePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
};

type CachedMediaRow = {
  key: string;
  relative_path: string;
  mime_type: string;
  size: number;
  created_at: number;
  last_accessed_at: number;
};

type TotalSizeRow = {
  total_size: number | null;
};

type TauriFs = typeof import('@tauri-apps/plugin-fs');
type TauriPath = typeof import('@tauri-apps/api/path');
type TauriCore = typeof import('@tauri-apps/api/core');
type SqlDatabase = import('@tauri-apps/plugin-sql').default;

const MEDIA_CACHE_DIR = 'media-cache';
const MEDIA_CACHE_OBJECTS_DIR = `${MEDIA_CACHE_DIR}/objects`;
const MEDIA_CACHE_DB_NAME = 'index.sqlite3';
const MEDIA_CACHE_BASE_DIR = 'AppLocalData';
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const CLEANUP_TARGET_RATIO = 0.9;

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let tauriModulesPromise: Promise<
  | {
      fs: TauriFs;
      path: TauriPath;
      core: TauriCore;
      db: SqlDatabase;
    }
  | undefined
> | null = null;
let cleanupPromise: Promise<void> | null = null;
const requestPromises = new Map<string, Promise<Blob>>();

const warn = (message: string, error: unknown) => {
  console.warn(`[mediaCache] ${message}`, error);
};

const getTauriModules = async () => {
  if (!isTauri) return undefined;
  if (!tauriModulesPromise) {
    tauriModulesPromise = Promise.all([
      import('@tauri-apps/plugin-fs'),
      import('@tauri-apps/api/path'),
      import('@tauri-apps/api/core'),
      import('@tauri-apps/plugin-sql'),
    ])
      .then(async ([fs, path, core, sql]) => {
        await ensureCacheDirs(fs);
        const appLocalDataDir = await path.appLocalDataDir();
        const dbPath = await path.join(appLocalDataDir, MEDIA_CACHE_DIR, MEDIA_CACHE_DB_NAME);
        const db = await sql.default.load(`sqlite:${dbPath}`);
        await initDatabase(db);
        return { fs, path, core, db };
      })
      .catch((error) => {
        warn('Failed to load Tauri cache modules', error);
        return undefined;
      });
  }
  return tauriModulesPromise;
};

const ensureCacheDirs = async (fs: TauriFs, relativeDir = MEDIA_CACHE_OBJECTS_DIR) => {
  await fs.mkdir(relativeDir, { baseDir: fs.BaseDirectory[MEDIA_CACHE_BASE_DIR], recursive: true });
};

const initDatabase = async (db: SqlDatabase): Promise<void> => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS media_cache_entries (
      key TEXT PRIMARY KEY,
      relative_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_accessed_at INTEGER NOT NULL
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_media_cache_entries_last_accessed_at
    ON media_cache_entries(last_accessed_at)
  `);
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const safeExt = (mimeType: string): string => {
  const [type] = mimeType.split(';');
  const ext = mimeTypeToExt(type || FALLBACK_MIMETYPE)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16);
  return ext || 'bin';
};

const toEntry = (row: CachedMediaRow): CachedMediaEntry => ({
  key: row.key,
  relativePath: row.relative_path,
  mimeType: row.mime_type,
  size: Number(row.size),
  createdAt: Number(row.created_at),
  lastAccessedAt: Number(row.last_accessed_at),
});

const getCacheKey = async (request: CachedMediaRequest): Promise<string> => {
  const payload: Record<string, unknown> = {
    mediaUrl: request.mediaUrl,
    mimeType: request.mimeType,
    encInfo: request.encInfo,
    cacheVariant: request.cacheVariant,
  };
  if (typeof request.createdAt === 'number' && Number.isFinite(request.createdAt)) {
    payload.createdAt = request.createdAt;
  }
  return sha256(stableStringify(payload));
};

const getCreatedAt = (request: CachedMediaRequest): number =>
  typeof request.createdAt === 'number' && Number.isFinite(request.createdAt)
    ? request.createdAt
    : Date.now();

const getObjectDir = (createdAt: number): string => {
  const date = new Date(createdAt);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${MEDIA_CACHE_OBJECTS_DIR}/${year}/${month}/${day}`;
};

const getRelativePath = (key: string, mimeType: string, createdAt: number): string =>
  `${getObjectDir(createdAt)}/${key}.${safeExt(mimeType)}`;

const getCachedEntry = async (
  db: SqlDatabase,
  key: string,
): Promise<CachedMediaEntry | undefined> => {
  const rows = await db.select<CachedMediaRow[]>(
    `SELECT key, relative_path, mime_type, size, created_at, last_accessed_at
     FROM media_cache_entries
     WHERE key = $1
     LIMIT 1`,
    [key],
  );
  return rows[0] ? toEntry(rows[0]) : undefined;
};

const upsertCachedEntry = async (db: SqlDatabase, entry: CachedMediaEntry): Promise<void> => {
  await db.execute(
    `INSERT INTO media_cache_entries
      (key, relative_path, mime_type, size, created_at, last_accessed_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(key) DO UPDATE SET
      relative_path = excluded.relative_path,
      mime_type = excluded.mime_type,
      size = excluded.size,
      last_accessed_at = excluded.last_accessed_at`,
    [
      entry.key,
      entry.relativePath,
      entry.mimeType,
      entry.size,
      entry.createdAt,
      entry.lastAccessedAt,
    ],
  );
};

const deleteCachedEntry = async (db: SqlDatabase, key: string): Promise<void> => {
  await db.execute('DELETE FROM media_cache_entries WHERE key = $1', [key]);
};

const readCachedBlob = async (
  fs: TauriFs,
  db: SqlDatabase,
  entry: CachedMediaEntry,
): Promise<Blob | undefined> => {
  try {
    const exists = await fs.exists(entry.relativePath, {
      baseDir: fs.BaseDirectory[MEDIA_CACHE_BASE_DIR],
    });
    if (!exists) return undefined;
    const bytes = await fs.readFile(entry.relativePath, {
      baseDir: fs.BaseDirectory[MEDIA_CACHE_BASE_DIR],
    });
    const lastAccessedAt = Date.now();
    await db.execute('UPDATE media_cache_entries SET last_accessed_at = $1 WHERE key = $2', [
      lastAccessedAt,
      entry.key,
    ]);
    return new Blob([bytes], { type: entry.mimeType || FALLBACK_MIMETYPE });
  } catch (error) {
    warn('Failed to read cached media', error);
    return undefined;
  }
};

const downloadRequestBlob = async (request: CachedMediaRequest): Promise<Blob> =>
  request.encInfo
    ? downloadEncryptedMedia(request.mediaUrl, (encBuf) =>
        decryptFile(
          encBuf,
          request.mimeType || FALLBACK_MIMETYPE,
          request.encInfo as EncryptedAttachmentInfo,
        ),
      )
    : downloadMedia(request.mediaUrl);

const writeCachedBlob = async (
  fs: TauriFs,
  db: SqlDatabase,
  request: CachedMediaRequest,
  key: string,
  blob: Blob,
): Promise<void> => {
  const mimeType = request.mimeType || blob.type || FALLBACK_MIMETYPE;
  const existing = await getCachedEntry(db, key);
  const createdAt = existing?.createdAt ?? getCreatedAt(request);
  const relativePath = existing?.relativePath ?? getRelativePath(key, mimeType, createdAt);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  await ensureCacheDirs(fs, getObjectDir(createdAt));
  await fs.writeFile(relativePath, bytes, { baseDir: fs.BaseDirectory[MEDIA_CACHE_BASE_DIR] });

  await upsertCachedEntry(db, {
    key,
    relativePath,
    mimeType,
    size: bytes.byteLength,
    createdAt,
    lastAccessedAt: Date.now(),
  });
};

const loadFromCacheOrDownload = async (request: CachedMediaRequest, key: string): Promise<Blob> => {
  const modules = await getTauriModules();
  if (!modules) return downloadRequestBlob(request);

  try {
    const entry = await getCachedEntry(modules.db, key);
    if (entry) {
      const cachedBlob = await readCachedBlob(modules.fs, modules.db, entry);
      if (cachedBlob) return cachedBlob;
      await deleteCachedEntry(modules.db, key);
    }
  } catch (error) {
    warn('Failed to inspect cached media', error);
  }

  const blob = await downloadRequestBlob(request);
  try {
    await writeCachedBlob(modules.fs, modules.db, request, key, blob);
    void cleanupMediaCache().catch((error) => warn('Cache cleanup failed', error));
  } catch (error) {
    warn('Failed to write cached media', error);
  }
  return blob;
};

export const loadCachedMediaBlob = async (
  request: CachedMediaRequest,
  cacheKey?: string,
): Promise<Blob> => {
  const key = cacheKey ?? (await getCacheKey(request));
  const existing = requestPromises.get(key);
  if (existing) return existing;

  const promise = loadFromCacheOrDownload(request, key).finally(() => {
    requestPromises.delete(key);
  });
  requestPromises.set(key, promise);
  return promise;
};

export const loadCachedMediaUrl = async (request: CachedMediaRequest): Promise<string> => {
  const modules = await getTauriModules();
  if (!modules) {
    const blob = await loadCachedMediaBlob(request);
    return URL.createObjectURL(blob);
  }

  const key = await getCacheKey(request);
  await loadCachedMediaBlob(request, key);

  const entry = await getCachedEntry(modules.db, key);
  if (!entry) {
    const blob = await loadCachedMediaBlob(request, key);
    return URL.createObjectURL(blob);
  }

  try {
    const appLocalDataDir = await modules.path.appLocalDataDir();
    const filePath = await modules.path.join(appLocalDataDir, entry.relativePath);
    return modules.core.convertFileSrc(filePath);
  } catch (error) {
    warn('Failed to create cached media asset URL', error);
    const blob = await loadCachedMediaBlob(request, key);
    return URL.createObjectURL(blob);
  }
};

export const loadCachedMediaFilePath = async (request: CachedMediaRequest): Promise<string> => {
  const modules = await getTauriModules();
  if (!modules) {
    throw new Error('Cached media file paths are only available in Tauri.');
  }

  const key = await getCacheKey(request);
  await loadCachedMediaBlob(request, key);

  const entry = await getCachedEntry(modules.db, key);
  if (!entry) {
    throw new Error('Cached media entry was not found after loading media.');
  }

  const appLocalDataDir = await modules.path.appLocalDataDir();
  return modules.path.join(appLocalDataDir, entry.relativePath);
};

export const cleanupMediaCache = async (maxBytes = DEFAULT_MAX_BYTES): Promise<void> => {
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = (async () => {
    const modules = await getTauriModules();
    if (!modules) return;

    const totalRows = await modules.db.select<TotalSizeRow[]>(
      'SELECT COALESCE(SUM(size), 0) AS total_size FROM media_cache_entries',
    );
    let totalSize = Number(totalRows[0]?.total_size ?? 0);
    if (totalSize <= maxBytes) return;

    const targetBytes = Math.floor(maxBytes * CLEANUP_TARGET_RATIO);
    const rows = await modules.db.select<CachedMediaRow[]>(
      `SELECT key, relative_path, mime_type, size, created_at, last_accessed_at
       FROM media_cache_entries
       ORDER BY last_accessed_at ASC`,
    );

    for (const row of rows) {
      if (totalSize <= targetBytes) break;
      const entry = toEntry(row);
      try {
        await modules.fs.remove(entry.relativePath, {
          baseDir: modules.fs.BaseDirectory[MEDIA_CACHE_BASE_DIR],
        });
      } catch {
        // Missing files are handled by dropping their SQLite entries.
      }
      await deleteCachedEntry(modules.db, entry.key);
      totalSize -= entry.size;
    }
  })().finally(() => {
    cleanupPromise = null;
  });

  return cleanupPromise;
};
