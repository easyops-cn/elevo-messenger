import { MatrixClient, ReceiptType, type EventTimeline, type Room, type Thread } from 'matrix-js-sdk';

export async function markAsRead(mx: MatrixClient, roomId: string, privateReceipt: boolean, threadRootId?: string) {
  const room = mx.getRoom(roomId);
  if (!room) return;

  let timeline: EventTimeline | undefined;
  let receiptStore: Room | Thread = room;
  if (threadRootId) {
    const thread = room.getThread(threadRootId);
    if (!thread) return;
    receiptStore = thread;
    timeline = thread.liveTimeline;
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

  await mx.sendReadReceipt(
    latestEvent,
    privateReceipt ? ReceiptType.ReadPrivate : ReceiptType.Read
  );
}
