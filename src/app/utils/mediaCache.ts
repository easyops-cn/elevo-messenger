import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from './matrix';
import { FALLBACK_MIMETYPE, mimeTypeToExt } from './mimeTypes';

export type CachedMediaRequest = {
  mediaUrl: string;
  mimeType: string;
  encInfo?: EncryptedAttachmentInfo;
  cacheVariant?: string;
};

export type CachedMediaEntry = {
  key: string;
  relativePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
  lastAccessedAt: number;
};

type CachedMediaIndex = {
  entries: Record<string, CachedMediaEntry>;
};

type TauriFs = typeof import('@tauri-apps/plugin-fs');
type TauriPath = typeof import('@tauri-apps/api/path');
type TauriCore = typeof import('@tauri-apps/api/core');

const MEDIA_CACHE_DIR = 'media-cache';
const MEDIA_CACHE_OBJECTS_DIR = `${MEDIA_CACHE_DIR}/objects`;
const MEDIA_CACHE_INDEX_PATH = `${MEDIA_CACHE_DIR}/index.json`;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const CLEANUP_TARGET_RATIO = 0.9;

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let tauriModulesPromise: Promise<
  | {
      fs: TauriFs;
      path: TauriPath;
      core: TauriCore;
    }
  | undefined
> | null = null;
let indexWriteQueue = Promise.resolve();
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
    ])
      .then(([fs, path, core]) => ({ fs, path, core }))
      .catch((error) => {
        warn('Failed to load Tauri modules', error);
        return undefined;
      });
  }
  return tauriModulesPromise;
};

const ensureCacheDirs = async (fs: TauriFs) => {
  const options = { baseDir: fs.BaseDirectory.AppData, recursive: true };
  await fs.mkdir(MEDIA_CACHE_OBJECTS_DIR, options);
};

const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

const readIndex = async (fs: TauriFs): Promise<CachedMediaIndex> => {
  try {
    const indexText = await fs.readTextFile(MEDIA_CACHE_INDEX_PATH, {
      baseDir: fs.BaseDirectory.AppData,
    });
    const parsed = safeJsonParse<Partial<CachedMediaIndex>>(indexText, { entries: {} });
    return parsed && typeof parsed.entries === 'object'
      ? { entries: parsed.entries ?? {} }
      : { entries: {} };
  } catch {
    return { entries: {} };
  }
};

const writeIndexNow = async (fs: TauriFs, index: CachedMediaIndex): Promise<void> => {
  await ensureCacheDirs(fs);
  await fs.writeTextFile(MEDIA_CACHE_INDEX_PATH, JSON.stringify(index), {
    baseDir: fs.BaseDirectory.AppData,
  });
};

const updateIndex = async (
  fs: TauriFs,
  updater: (index: CachedMediaIndex) => void | Promise<void>,
): Promise<void> => {
  indexWriteQueue = indexWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const index = await readIndex(fs);
      await updater(index);
      await writeIndexNow(fs, index);
    });
  await indexWriteQueue;
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

const getCacheKey = async (request: CachedMediaRequest): Promise<string> =>
  sha256(
    stableStringify({
      mediaUrl: request.mediaUrl,
      mimeType: request.mimeType,
      encInfo: request.encInfo,
      cacheVariant: request.cacheVariant,
    }),
  );

const getRelativePath = (key: string, mimeType: string): string =>
  `${MEDIA_CACHE_OBJECTS_DIR}/${key}.${safeExt(mimeType)}`;

const readCachedBlob = async (
  fs: TauriFs,
  index: CachedMediaIndex,
  entry: CachedMediaEntry,
): Promise<Blob | undefined> => {
  try {
    const exists = await fs.exists(entry.relativePath, { baseDir: fs.BaseDirectory.AppData });
    if (!exists) return undefined;
    const bytes = await fs.readFile(entry.relativePath, { baseDir: fs.BaseDirectory.AppData });
    const lastAccessedAt = Date.now();
    entry.lastAccessedAt = lastAccessedAt;
    await updateIndex(fs, (latestIndex) => {
      const latestEntry = latestIndex.entries[entry.key];
      if (latestEntry) latestEntry.lastAccessedAt = lastAccessedAt;
    });
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
  request: CachedMediaRequest,
  key: string,
  blob: Blob,
): Promise<void> => {
  try {
    await ensureCacheDirs(fs);
    const relativePath = getRelativePath(key, request.mimeType || blob.type || FALLBACK_MIMETYPE);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await fs.writeFile(relativePath, bytes, { baseDir: fs.BaseDirectory.AppData });

    const now = Date.now();
    await updateIndex(fs, (index) => {
      index.entries[key] = {
        key,
        relativePath,
        mimeType: request.mimeType || blob.type || FALLBACK_MIMETYPE,
        size: bytes.byteLength,
        createdAt: index.entries[key]?.createdAt ?? now,
        lastAccessedAt: now,
      };
    });
    void cleanupMediaCache().catch((error) => warn('Cache cleanup failed', error));
  } catch (error) {
    warn('Failed to write cached media', error);
  }
};

const loadFromCacheOrDownload = async (request: CachedMediaRequest, key: string): Promise<Blob> => {
  const modules = await getTauriModules();
  if (!modules) return downloadRequestBlob(request);

  try {
    await ensureCacheDirs(modules.fs);
    const index = await readIndex(modules.fs);
    const entry = index.entries[key];
    if (entry) {
      const cachedBlob = await readCachedBlob(modules.fs, index, entry);
      if (cachedBlob) return cachedBlob;
      await updateIndex(modules.fs, (latestIndex) => {
        delete latestIndex.entries[key];
      });
    }
  } catch (error) {
    warn('Failed to inspect cached media', error);
  }

  const blob = await downloadRequestBlob(request);
  await writeCachedBlob(modules.fs, request, key, blob);
  return blob;
};

export const loadCachedMediaBlob = async (request: CachedMediaRequest): Promise<Blob> => {
  const key = await getCacheKey(request);
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
  await loadCachedMediaBlob(request);

  const index = await readIndex(modules.fs);
  const entry = index.entries[key];
  if (!entry) {
    const blob = await loadCachedMediaBlob(request);
    return URL.createObjectURL(blob);
  }

  try {
    const appDataDir = await modules.path.appDataDir();
    const filePath = await modules.path.join(appDataDir, entry.relativePath);
    return modules.core.convertFileSrc(filePath);
  } catch (error) {
    warn('Failed to create cached media asset URL', error);
    const blob = await loadCachedMediaBlob(request);
    return URL.createObjectURL(blob);
  }
};

export const cleanupMediaCache = async (maxBytes = DEFAULT_MAX_BYTES): Promise<void> => {
  if (cleanupPromise) return cleanupPromise;

  cleanupPromise = (async () => {
    const modules = await getTauriModules();
    if (!modules) return;

    const index = await readIndex(modules.fs);
    const entries = Object.values(index.entries);
    let totalSize = 0;

    await Promise.all(
      entries.map(async (entry) => {
        try {
          const exists = await modules.fs.exists(entry.relativePath, {
            baseDir: modules.fs.BaseDirectory.AppData,
          });
          if (!exists) {
            delete index.entries[entry.key];
            return;
          }
          const info = await modules.fs.stat(entry.relativePath, {
            baseDir: modules.fs.BaseDirectory.AppData,
          });
          entry.size = info.size;
          totalSize += info.size;
        } catch {
          delete index.entries[entry.key];
        }
      }),
    );

    if (totalSize <= maxBytes) {
      await updateIndex(modules.fs, (latestIndex) => {
        latestIndex.entries = index.entries;
      });
      return;
    }

    const targetBytes = Math.floor(maxBytes * CLEANUP_TARGET_RATIO);
    const removable = Object.values(index.entries).sort(
      (a, b) => a.lastAccessedAt - b.lastAccessedAt,
    );

    for (const entry of removable) {
      if (totalSize <= targetBytes) break;
      try {
        await modules.fs.remove(entry.relativePath, { baseDir: modules.fs.BaseDirectory.AppData });
      } catch {
        // Missing files are handled by dropping their index entries.
      }
      totalSize -= entry.size;
      delete index.entries[entry.key];
    }

    await updateIndex(modules.fs, (latestIndex) => {
      latestIndex.entries = index.entries;
    });
  })().finally(() => {
    cleanupPromise = null;
  });

  return cleanupPromise;
};
