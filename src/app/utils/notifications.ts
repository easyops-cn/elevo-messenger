import { MatrixClient, ReceiptType, type EventTimeline, type Room, type Thread } from 'matrix-js-sdk';

const markedCache = new Map<string, string>();

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt: boolean, threadRootId?: string, unthreaded?: boolean) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  let timeline: EventTimeline | undefined;
  let receiptStore: Room | Thread = room;
  let keyId = roomId;
  if (threadRootId) {
    const thread = room.getThread(threadRootId);
    if (!thread) return;
    receiptStore = thread;
    timeline = thread.liveTimeline;
    keyId = threadRootId;
  } else {
    timeline = room.getLiveTimeline();
  }
  const events = timeline.getEvents();
  const readEventId = receiptStore.getEventReadUpTo(mx.getSafeUserId());

  const getLatestValidEvent = () => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const latestEvent = events[i];
      if (latestEvent.getId() === readEventId) return null;
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };
  if (events.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  const lastEventId = latestEvent.getId() ?? '';
  if (markedCache.get(keyId) === lastEventId) return;

  markedCache.set(keyId, lastEventId);

  await mx.sendReadReceipt(
    latestEvent,
    privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read,
    unthreaded
  );
}
