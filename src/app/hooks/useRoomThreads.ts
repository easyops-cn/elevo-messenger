import { useCallback, useEffect, useState } from 'react';
import { Room, RoomEvent } from 'matrix-js-sdk';

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

    room.on(RoomEvent.Timeline, syncThreads);

    return () => {
      alive = false;
      room.removeListener(RoomEvent.Timeline, syncThreads);
    };
  }, [room, reloadKey]);

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
