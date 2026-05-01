/* eslint-disable no-continue */
import { MatrixClient, MatrixEvent, Room } from 'matrix-js-sdk';
import { MessageEvent } from '../../types/matrix/room';
import { reactionOrEditEvent } from './room';

export type SortFunc<T> = (a: T, b: T) => number;

const CONTENTFUL_EVENT_TYPES = new Set<string>([
  MessageEvent.RoomMessage,
  MessageEvent.RoomMessageEncrypted,
  MessageEvent.Sticker,
]);

function getLastContentfulOrEarliestTimestamp(events: MatrixEvent[]): number | undefined {
  if (events.length === 0) return undefined;

  const eventsReversed = [...events].reverse();
  let earliestTs: number | undefined;
  let result: number | undefined;

  eventsReversed.every((evt) => {
    if (!evt) return true;

    const ts = evt.getTs();
    if (earliestTs === undefined || ts < earliestTs) {
      earliestTs = ts;
    }

    if (evt.isRedacted()) return true;
    if (reactionOrEditEvent(evt)) return true;
    if (CONTENTFUL_EVENT_TYPES.has(evt.getType())) {
      result = ts;
      return false; // break
    }

    return true;
  });

  return result ?? earliestTs;
}

export function getRoomLastActivityTimestamp(room: Room): number {
  const liveEvents = room.getLiveTimeline().getEvents();
  let maxTs = getLastContentfulOrEarliestTimestamp(liveEvents) ?? Number.MIN_SAFE_INTEGER;

  const threads = room.getThreads();
  threads.forEach((thread) => {
    const event = thread.replyToEvent ?? thread.rootEvent;
    const threadTs = event?.getTs();
    if (threadTs !== undefined && threadTs > maxTs) {
      maxTs = threadTs;
    }
  });

  return maxTs;
}

export function sortRoomIdsByActivity(
  roomIds: string[],
  getRoom: (id: string) => Room | undefined
): string[] {
  const cache = new Map<string, number>();

  const getTimestamp = (roomId: string): number => {
    const cached = cache.get(roomId);
    if (cached !== undefined) return cached;

    const room = getRoom(roomId);
    const ts = room ? getRoomLastActivityTimestamp(room) : Number.MIN_SAFE_INTEGER;
    cache.set(roomId, ts);
    return ts;
  };

  return [...roomIds].sort((a, b) => getTimestamp(b) - getTimestamp(a));
}

export const factoryRoomIdByActivity =
  (mx: MatrixClient): SortFunc<string> =>
  (a, b) => {
    const room1 = mx.getRoom(a);
    const room2 = mx.getRoom(b);

    return (
      (room2?.getLastActiveTimestamp() ?? Number.MIN_SAFE_INTEGER) -
      (room1?.getLastActiveTimestamp() ?? Number.MIN_SAFE_INTEGER)
    );
  };

export const factoryRoomIdByAtoZ =
  (mx: MatrixClient): SortFunc<string> =>
  (a, b) => {
    let aName = mx.getRoom(a)?.name ?? '';
    let bName = mx.getRoom(b)?.name ?? '';

    // remove "#" from the room name
    // To ignore it in sorting
    aName = aName.replace(/#/g, '');
    bName = bName.replace(/#/g, '');

    if (aName.toLowerCase() < bName.toLowerCase()) {
      return -1;
    }
    if (aName.toLowerCase() > bName.toLowerCase()) {
      return 1;
    }
    return 0;
  };

export const factoryRoomIdByUnreadCount =
  (getUnreadCount: (roomId: string) => number): SortFunc<string> =>
  (a, b) => {
    const aT = getUnreadCount(a) ?? 0;
    const bT = getUnreadCount(b) ?? 0;
    return bT - aT;
  };

export const byTsOldToNew: SortFunc<number> = (a, b) => a - b;

export const byOrderKey: SortFunc<string | undefined> = (a, b) => {
  if (!a && !b) {
    return 0;
  }

  if (!b) return -1;
  if (!a) return 1;

  if (a < b) {
    return -1;
  }
  return 1;
};
