import { useCallback, useEffect, useState } from 'react';
import { Room, RoomEvent, ThreadEvent, type RoomEventHandlerMap } from 'matrix-js-sdk';
import { useThreadChat } from '../state/threadChat';

export type RoomThread = ReturnType<Room['getThreads']>[number];

type UseRoomThreadsResult = {
  threads: RoomThread[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export const useRoomThreads = (room: Room): UseRoomThreadsResult => {
  const [threads, setThreads] = useState<RoomThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [, setThreadChat] = useThreadChat(room.roomId);

  useEffect(() => {
    let alive = true;

    if (!room || room.isSpaceRoom()) {
      setThreads([]);
      setLoading(false);
      setError(false);
      return () => {
        alive = false;
      };
    }

    const syncThreads = () => {
      if (!alive) return;
      setThreads(room.getThreads());
    };

    const loadThreads = async () => {
      setLoading(true);
      setError(false);
      try {
        await room.createThreadsTimelineSets();
        await room.fetchRoomThreads();
        syncThreads();
      } catch {
        if (!alive) return;
        setError(true);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadThreads();

    const handleThreadNew: RoomEventHandlerMap[ThreadEvent.New] = async (thread) => {
      // if (thread.rootEvent?.sender?.userId === room.client.getSafeUserId()) {
        const threadId = thread.rootEvent?.getId();
        if (threadId) {
          setThreadChat({ open: true, threadRootId: threadId });
        }
      // }
      syncThreads();
    }
 
    const handleThreadNewReply: RoomEventHandlerMap[ThreadEvent.NewReply] = async (thread) => {
      // if (thread.rootEvent?.sender?.userId === room.client.getSafeUserId()) {
        const threadId = thread.rootEvent?.getId();
        if (threadId) {
          setThreadChat({ open: true, threadRootId: threadId });
        }
      // }
      syncThreads();
    }
 
    room.on(ThreadEvent.New, handleThreadNew);
    room.on(ThreadEvent.NewReply, handleThreadNewReply);
    room.on(RoomEvent.Timeline, syncThreads);

    return () => {
      alive = false;
      room.removeListener(RoomEvent.Timeline, syncThreads);
      room.removeListener(ThreadEvent.New, handleThreadNew);
      room.removeListener(ThreadEvent.NewReply, handleThreadNewReply);
    };
  }, [room, reloadKey, setThreadChat]);

  const retry = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  return {
    threads,
    loading,
    error,
    retry,
  };
};
