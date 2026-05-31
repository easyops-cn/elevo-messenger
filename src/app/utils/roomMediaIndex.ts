import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { MatrixClient, MatrixEvent, MsgType, Room } from 'matrix-js-sdk';
import { MessageEvent } from '../../types/matrix/room';
import { IAudioInfo, IEncryptedFile, IFileInfo } from '../../types/matrix/common';
import { FALLBACK_MIMETYPE } from './mimeTypes';
import { getMediaCacheDatabase } from './mediaCache';
import { isDesktopTauri } from '../plugins/useTauriOpener';

export type RoomMediaEntry = {
  eventId: string;
  roomId: string;
  sender?: string;
  eventTs: number;
  msgtype: string;
  filename: string;
  mimeType: string;
  size: number;
  mediaMxc: string;
  encryptedFile?: IEncryptedFile;
  info: Record<string, unknown>;
  content: Record<string, unknown>;
};

type RoomMediaIndexListener = () => void;

type RoomMediaRow = {
  event_id: string;
  room_id: string;
  sender: string | null;
  event_ts: number;
  msgtype: string;
  filename: string;
  mime_type: string;
  size: number;
  media_mxc: string;
  encrypted_file_json: string | null;
  info_json: string | null;
  content_json: string;
};

const ALLOWED_FILE_MSG_TYPES: Set<string> = new Set([
  MsgType.File,
  MsgType.Image,
  MsgType.Audio,
  MsgType.Video,
]);
const LOADED_TIMELINES_MIGRATION_KEY = 'loaded_timelines_v1';

let initPromise: Promise<void> | null = null;
const roomListeners = new Map<string, Set<RoomMediaIndexListener>>();

const warn = (message: string, error: unknown) => {
  console.warn(`[roomMediaIndex] ${message}`, error);
};

const emitRoomMediaIndexChange = (roomId: string) => {
  roomListeners.get(roomId)?.forEach((listener) => listener());
};

export const subscribeRoomMediaIndex = (
  roomId: string,
  listener: RoomMediaIndexListener,
): (() => void) => {
  let listeners = roomListeners.get(roomId);
  if (!listeners) {
    listeners = new Set();
    roomListeners.set(roomId, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      roomListeners.delete(roomId);
    }
  };
};

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const getEncryptedFile = (value: unknown): IEncryptedFile | undefined => {
  const record = normalizeRecord(value);
  return typeof record.url === 'string' ? (record as unknown as IEncryptedFile) : undefined;
};

const getDatabase = async () => {
  if (!isDesktopTauri) return undefined;
  const db = await getMediaCacheDatabase();
  if (!db) return undefined;

  if (!initPromise) {
    initPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS room_media_entries (
          event_id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          sender TEXT,
          event_ts INTEGER NOT NULL,
          msgtype TEXT NOT NULL,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          media_mxc TEXT NOT NULL,
          encrypted_file_json TEXT,
          info_json TEXT,
          content_json TEXT NOT NULL
        )
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_room_media_entries_room_ts
        ON room_media_entries(room_id, event_ts DESC)
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_room_media_entries_media_mxc
        ON room_media_entries(media_mxc)
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS room_media_index_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
  return db;
};

const getMetaValue = async (key: string): Promise<string | undefined> => {
  const db = await getDatabase();
  if (!db) return undefined;
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM room_media_index_meta WHERE key = $1 LIMIT 1',
    [key],
  );
  return rows[0]?.value;
};

const setMetaValue = async (key: string, value: string): Promise<void> => {
  const db = await getDatabase();
  if (!db) return;
  await db.execute(
    `INSERT INTO room_media_index_meta (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at`,
    [key, value, Date.now()],
  );
};

const toEntry = (row: RoomMediaRow): RoomMediaEntry => ({
  eventId: row.event_id,
  roomId: row.room_id,
  sender: row.sender ?? undefined,
  eventTs: Number(row.event_ts),
  msgtype: row.msgtype,
  filename: row.filename,
  mimeType: row.mime_type,
  size: Number(row.size),
  mediaMxc: row.media_mxc,
  encryptedFile: parseJson<IEncryptedFile | undefined>(row.encrypted_file_json, undefined),
  info: parseJson<Record<string, unknown>>(row.info_json, {}),
  content: parseJson<Record<string, unknown>>(row.content_json, {}),
});

export const isRoomMediaEvent = (mEvent: MatrixEvent): boolean => {
  if (mEvent.isRedacted()) return false;
  const eventType = mEvent.getType();
  if (eventType !== MessageEvent.RoomMessage && eventType !== MessageEvent.RoomMessageEncrypted) {
    return false;
  }

  const msgtype = mEvent.getContent()?.msgtype;
  return typeof msgtype === 'string' && ALLOWED_FILE_MSG_TYPES.has(msgtype);
};

const getContentForIndex = (mEvent: MatrixEvent): Record<string, unknown> | undefined => {
  if (!isRoomMediaEvent(mEvent)) return undefined;
  return normalizeRecord(mEvent.getContent());
};

export const extractRoomMediaEntry = (
  roomId: string,
  mEvent: MatrixEvent,
): RoomMediaEntry | undefined => {
  const eventId = mEvent.getId();
  const content = getContentForIndex(mEvent);
  if (!eventId || !content) return undefined;

  const msgtype = typeof content.msgtype === 'string' ? content.msgtype : '';
  const info = normalizeRecord(content.info);
  const encryptedFile = getEncryptedFile(content.file);
  const msc1767File = normalizeRecord(content['org.matrix.msc1767.file']);
  const filename =
    (typeof msc1767File.name === 'string' && msc1767File.name) ||
    (typeof content.filename === 'string' && content.filename) ||
    (typeof content.body === 'string' && content.body) ||
    'Unnamed File';
  const mimeType =
    (typeof info.mimetype === 'string' && info.mimetype) ||
    (typeof msc1767File.mimetype === 'string' && msc1767File.mimetype) ||
    FALLBACK_MIMETYPE;
  const size =
    (typeof info.size === 'number' && Number.isFinite(info.size) && info.size) ||
    (typeof msc1767File.size === 'number' &&
      Number.isFinite(msc1767File.size) &&
      msc1767File.size) ||
    0;
  const mediaMxc =
    (encryptedFile && typeof encryptedFile.url === 'string' && encryptedFile.url) ||
    (typeof content.url === 'string' && content.url) ||
    (typeof msc1767File.url === 'string' && msc1767File.url) ||
    undefined;

  if (!mediaMxc || !msgtype) return undefined;

  return {
    eventId,
    roomId,
    sender: mEvent.getSender() ?? undefined,
    eventTs: mEvent.getTs(),
    msgtype,
    filename,
    mimeType,
    size,
    mediaMxc,
    encryptedFile,
    info,
    content,
  };
};

export const upsertRoomMediaEvent = async (roomId: string, mEvent: MatrixEvent): Promise<void> => {
  const entry = extractRoomMediaEntry(roomId, mEvent);
  if (!entry) return;

  try {
    const db = await getDatabase();
    if (!db) return;
    await db.execute(
      `INSERT INTO room_media_entries
        (event_id, room_id, sender, event_ts, msgtype, filename, mime_type, size, media_mxc,
         encrypted_file_json, info_json, content_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT(event_id) DO UPDATE SET
        room_id = excluded.room_id,
        sender = excluded.sender,
        event_ts = excluded.event_ts,
        msgtype = excluded.msgtype,
        filename = excluded.filename,
        mime_type = excluded.mime_type,
        size = excluded.size,
        media_mxc = excluded.media_mxc,
        encrypted_file_json = excluded.encrypted_file_json,
        info_json = excluded.info_json,
        content_json = excluded.content_json`,
      [
        entry.eventId,
        entry.roomId,
        entry.sender ?? null,
        entry.eventTs,
        entry.msgtype,
        entry.filename,
        entry.mimeType,
        entry.size,
        entry.mediaMxc,
        entry.encryptedFile ? JSON.stringify(entry.encryptedFile) : null,
        JSON.stringify(entry.info),
        JSON.stringify(entry.content),
      ],
    );
    emitRoomMediaIndexChange(entry.roomId);
  } catch (error) {
    warn('Failed to upsert room media event', error);
  }
};

export const removeRoomMediaEvent = async (roomId: string, eventId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) return;
    await db.execute('DELETE FROM room_media_entries WHERE room_id = $1 AND event_id = $2', [
      roomId,
      eventId,
    ]);
    emitRoomMediaIndexChange(roomId);
  } catch (error) {
    warn('Failed to remove room media event', error);
  }
};

export const deleteRoomMediaEvent = async (roomId: string, eventId: string): Promise<void> => {
  try {
    const db = await getDatabase();
    if (!db) return;
    await db.execute('DELETE FROM room_media_entries WHERE room_id = $1 AND event_id = $2', [
      roomId,
      eventId,
    ]);
    emitRoomMediaIndexChange(roomId);
  } catch (error) {
    warn('Failed to delete room media event', error);
  }
};

export const replaceRoomMediaEventId = async (
  roomId: string,
  oldEventId: string,
  mEvent: MatrixEvent,
): Promise<void> => {
  const newEventId = mEvent.getId();
  if (!newEventId || oldEventId === newEventId) return;

  try {
    await upsertRoomMediaEvent(roomId, mEvent);
    const db = await getDatabase();
    if (!db) return;
    await db.execute('DELETE FROM room_media_entries WHERE room_id = $1 AND event_id = $2', [
      roomId,
      oldEventId,
    ]);
    emitRoomMediaIndexChange(roomId);
  } catch (error) {
    warn('Failed to replace room media event id', error);
  }
};

export const listRoomMediaEntries = async (
  roomId: string,
  limit = 50,
): Promise<RoomMediaEntry[]> => {
  try {
    const db = await getDatabase();
    if (!db) return [];
    const rows = await db.select<RoomMediaRow[]>(
      `SELECT event_id, room_id, sender, event_ts, msgtype, filename, mime_type, size, media_mxc,
        encrypted_file_json, info_json, content_json
       FROM room_media_entries
       WHERE room_id = $1
       ORDER BY event_ts DESC
       LIMIT $2`,
      [roomId, limit],
    );
    return rows.map(toEntry);
  } catch (error) {
    warn('Failed to list room media entries', error);
    throw error;
  }
};

export const backfillRoomMediaFromTimeline = async (room: Room): Promise<void> => {
  if (!isDesktopTauri || room.isSpaceRoom()) return;
  const timelineSets = [room.getLiveTimeline().getTimelineSet(), ...room.getTimelineSets()];
  const seen = new Set<string>();

  await Promise.all(
    timelineSets.flatMap((timelineSet) =>
      timelineSet.getTimelines().flatMap((timeline) =>
        timeline.getEvents().map(async (mEvent) => {
          const eventId = mEvent.getId();
          if (!eventId || seen.has(eventId)) return;
          seen.add(eventId);
          await upsertRoomMediaEvent(room.roomId, mEvent);
        }),
      ),
    ),
  );
};

export const migrateRoomMediaIndexFromLoadedTimelines = async (mx: MatrixClient): Promise<void> => {
  if (!isDesktopTauri) return;

  try {
    const migrated = await getMetaValue(LOADED_TIMELINES_MIGRATION_KEY);
    if (migrated === 'done') return;

    const rooms = mx.getRooms().filter((room) => !room.isSpaceRoom());
    for (const room of rooms) {
      await backfillRoomMediaFromTimeline(room);
    }

    await setMetaValue(LOADED_TIMELINES_MIGRATION_KEY, 'done');
  } catch (error) {
    warn('Failed to migrate loaded room media timelines', error);
  }
};

export const getRoomMediaAudioInfo = (entry: RoomMediaEntry): IAudioInfo =>
  entry.info as IAudioInfo;

export const getRoomMediaFileInfo = (entry: RoomMediaEntry): IFileInfo => entry.info as IFileInfo;

export const getRoomMediaEncryptedInfo = (
  entry: RoomMediaEntry,
): EncryptedAttachmentInfo | undefined => entry.encryptedFile;
