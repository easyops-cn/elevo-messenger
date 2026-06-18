export type RecentRoomInputMessage = {
  body: string;
  formattedBody?: string;
  updatedAt: number;
};

export type RoomInputRecentMessages = RecentRoomInputMessage[];

export type RecentRoomInputMessageStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const RECENT_ROOM_INPUT_MESSAGE_LIMIT = 10;

const STORAGE_KEY_PREFIX = 'recentRoomInputMessages';
const MAIN_TIMELINE_KEY = 'main';

const getStorageKey = (
  currentUserId: string,
  roomId: string,
  threadRootId: string | null | undefined,
): string =>
  [
    STORAGE_KEY_PREFIX,
    encodeURIComponent(currentUserId),
    encodeURIComponent(roomId),
    encodeURIComponent(threadRootId ?? MAIN_TIMELINE_KEY),
  ].join(':');

const getLocalStorage = (): RecentRoomInputMessageStorage | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
};

const isRecentRoomInputMessage = (message: unknown): message is RecentRoomInputMessage => {
  if (!message || typeof message !== 'object') return false;
  const { body, formattedBody, updatedAt } = message as RecentRoomInputMessage;

  return (
    typeof body === 'string' &&
    body.trim().length > 0 &&
    (formattedBody === undefined || typeof formattedBody === 'string') &&
    typeof updatedAt === 'number'
  );
};

const getMessageKey = (message: Pick<RecentRoomInputMessage, 'body' | 'formattedBody'>): string =>
  `${message.body}\u0000${message.formattedBody ?? ''}`;

export const sanitizeRoomInputRecentMessages = (value: unknown): RoomInputRecentMessages => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const validMessages: RoomInputRecentMessages = [];
  value.forEach((message) => {
    if (!isRecentRoomInputMessage(message)) return;

    const messageKey = getMessageKey(message);
    if (seen.has(messageKey)) return;

    seen.add(messageKey);
    validMessages.push(message);
  });

  return validMessages.slice(0, RECENT_ROOM_INPUT_MESSAGE_LIMIT);
};

export const getRoomInputRecentMessages = (
  currentUserId: string | null | undefined,
  roomId: string | null | undefined,
  threadRootId: string | null | undefined,
  storage: RecentRoomInputMessageStorage | undefined = getLocalStorage(),
): RoomInputRecentMessages => {
  if (!currentUserId || !roomId || !storage) return [];

  const item = storage.getItem(getStorageKey(currentUserId, roomId, threadRootId));
  if (!item) return [];

  try {
    return sanitizeRoomInputRecentMessages(JSON.parse(item));
  } catch {
    return [];
  }
};

export const putRoomInputRecentMessage = (
  currentUserId: string | null | undefined,
  roomId: string | null | undefined,
  threadRootId: string | null | undefined,
  message: Pick<RecentRoomInputMessage, 'body' | 'formattedBody'>,
  storage: RecentRoomInputMessageStorage | undefined = getLocalStorage(),
  updatedAt = Date.now(),
): RoomInputRecentMessages => {
  if (!currentUserId || !roomId || !storage || message.body.trim().length === 0) return [];

  const recentMessages = getRoomInputRecentMessages(currentUserId, roomId, threadRootId, storage);
  const messageKey = getMessageKey(message);
  const nextMessages = [
    { ...message, updatedAt },
    ...recentMessages.filter((entry) => getMessageKey(entry) !== messageKey),
  ].slice(0, RECENT_ROOM_INPUT_MESSAGE_LIMIT);

  storage.setItem(getStorageKey(currentUserId, roomId, threadRootId), JSON.stringify(nextMessages));

  return nextMessages;
};
