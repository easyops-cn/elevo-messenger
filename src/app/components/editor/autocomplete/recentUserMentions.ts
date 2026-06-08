export type RecentUserMentionEntry = {
  userId: string;
  updatedAt: number;
};

export type RoomRecentUserMentions = Record<string, RecentUserMentionEntry[]>;

export type RecentUserMentionStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const RECENT_USER_MENTION_LIMIT = 3;

const STORAGE_KEY_PREFIX = 'recentUserMentions';

const getStorageKey = (currentUserId: string): string =>
  `${STORAGE_KEY_PREFIX}:${encodeURIComponent(currentUserId)}`;

const getLocalStorage = (): RecentUserMentionStorage | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
};

const isRecentUserMentionEntry = (entry: unknown): entry is RecentUserMentionEntry => {
  if (!entry || typeof entry !== 'object') return false;
  const { userId, updatedAt } = entry as RecentUserMentionEntry;
  return typeof userId === 'string' && userId.length > 0 && typeof updatedAt === 'number';
};

const sanitizeRecentUserMentionEntries = (entries: unknown): RecentUserMentionEntry[] => {
  if (!Array.isArray(entries)) return [];

  const seen = new Set<string>();
  const validEntries: RecentUserMentionEntry[] = [];
  entries.forEach((entry) => {
    if (!isRecentUserMentionEntry(entry) || seen.has(entry.userId)) return;
    seen.add(entry.userId);
    validEntries.push(entry);
  });

  return validEntries.slice(0, RECENT_USER_MENTION_LIMIT);
};

export const sanitizeRoomRecentUserMentions = (value: unknown): RoomRecentUserMentions => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([roomId, entries]) => {
      if (!roomId) return [];
      const sanitizedEntries = sanitizeRecentUserMentionEntries(entries);
      if (sanitizedEntries.length === 0) return [];
      return [[roomId, sanitizedEntries]];
    }),
  );
};

export const readRoomRecentUserMentions = (
  currentUserId: string | null | undefined,
  storage: RecentUserMentionStorage | undefined = getLocalStorage(),
): RoomRecentUserMentions => {
  if (!currentUserId || !storage) return {};

  const item = storage.getItem(getStorageKey(currentUserId));
  if (!item) return {};

  try {
    return sanitizeRoomRecentUserMentions(JSON.parse(item));
  } catch {
    return {};
  }
};

export const getRecentUserMentionIds = (
  currentUserId: string | null | undefined,
  roomId: string,
  storage?: RecentUserMentionStorage,
): string[] =>
  readRoomRecentUserMentions(currentUserId, storage)[roomId]?.map((entry) => entry.userId) ?? [];

export const putRecentUserMention = (
  currentUserId: string | null | undefined,
  roomId: string,
  mentionedUserId: string,
  storage: RecentUserMentionStorage | undefined = getLocalStorage(),
  updatedAt = Date.now(),
): string[] => {
  if (!currentUserId || !roomId || !mentionedUserId || !storage) return [];

  const recentMentions = readRoomRecentUserMentions(currentUserId, storage);
  const existingRoomEntries = recentMentions[roomId] ?? [];
  const nextRoomEntries = [
    { userId: mentionedUserId, updatedAt },
    ...existingRoomEntries.filter((entry) => entry.userId !== mentionedUserId),
  ].slice(0, RECENT_USER_MENTION_LIMIT);

  storage.setItem(
    getStorageKey(currentUserId),
    JSON.stringify({
      ...recentMentions,
      [roomId]: nextRoomEntries,
    }),
  );

  return nextRoomEntries.map((entry) => entry.userId);
};

export const sortByRecentUserIds = <T>(
  items: T[],
  recentUserIds: string[],
  getUserId: (item: T) => string,
): T[] => {
  const recentIndex = new Map(recentUserIds.map((userId, index) => [userId, index]));

  return items
    .map((item, index) => ({ item, index, recentIndex: recentIndex.get(getUserId(item)) }))
    .sort((a, b) => {
      if (a.recentIndex === undefined && b.recentIndex === undefined) {
        return a.index - b.index;
      }
      if (a.recentIndex === undefined) return 1;
      if (b.recentIndex === undefined) return -1;
      return a.recentIndex - b.recentIndex || a.index - b.index;
    })
    .map(({ item }) => item);
};
