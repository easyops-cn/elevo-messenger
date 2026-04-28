import { useEffect, useState } from 'react';
import { Room, RoomEvent, RoomEventHandlerMap, type NotificationCount, type Thread } from 'matrix-js-sdk';
import { threadHaveNotification, threadHaveUnread } from '../utils/room';
import { useMatrixClient } from './useMatrixClient';

type UseThreadUnreadBadgeArgs = {
  room: Room;
  thread: Thread;
  threadId: string;
};

export function useThreadUnreadBadge({
  room,
  thread,
  threadId,
}: UseThreadUnreadBadgeArgs): boolean {
  const mx = useMatrixClient();
  const [hasThreadUnreadBadge, setHasThreadUnreadBadge] = useState(false);

  useEffect(() => {
    const getHasUnreadBadge = () =>
      threadHaveNotification(room, thread.id) || threadHaveUnread(mx, thread);

    const updateHasUnreadBadge = () => {
      setHasThreadUnreadBadge(getHasUnreadBadge());
    };

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (timelineEvent) => {
      const eventId = timelineEvent.getId();
      if (timelineEvent.threadRootId !== threadId && eventId !== threadId) {
        return;
      }
      updateHasUnreadBadge();
    };

    const handleUnreadNotifications = (count?: NotificationCount, evtThreadId?: string) => {
      // Discarding all events not related to the thread if one has been setup
      if (threadId !== evtThreadId) return;
      updateHasUnreadBadge();
    };

    room.on(RoomEvent.UnreadNotifications, handleUnreadNotifications);
    room.on(RoomEvent.Timeline, handleTimelineEvent);
    room.on(RoomEvent.Receipt, updateHasUnreadBadge);
    room.on(RoomEvent.Redaction, updateHasUnreadBadge);
    room.on(RoomEvent.LocalEchoUpdated, updateHasUnreadBadge);
    return () => {
      room.removeListener(RoomEvent.UnreadNotifications, handleUnreadNotifications);
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      room.removeListener(RoomEvent.Receipt, updateHasUnreadBadge);
      room.removeListener(RoomEvent.Redaction, updateHasUnreadBadge);
      room.removeListener(RoomEvent.LocalEchoUpdated, updateHasUnreadBadge);
    };
  }, [threadId, mx, room, thread]);

  return hasThreadUnreadBadge;
}
