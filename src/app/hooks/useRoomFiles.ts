import { useCallback, useEffect, useState } from 'react';
import { Filter, MatrixEvent, Room, RoomEvent } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';

type UseRoomFilesResult = {
  files: MatrixEvent[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export const useRoomFiles = (room: Room): UseRoomFilesResult => {
  const mx = useMatrixClient();
  const [files, setFiles] = useState<MatrixEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!room || room.isSpaceRoom()) {
      setFiles([]);
      setLoading(false);
      setError(false);
      return () => {
        alive = false;
      };
    }

    const filter = new Filter(mx.getSafeUserId());
    filter.setDefinition({
      room: {
        timeline: {
          contains_url: true,
          types: ['m.room.message'],
        },
      },
    });

    let syncFiles: (() => void) | undefined;
    let syncCounter = 0;

    const loadFiles = async () => {
      setLoading(true);
      setError(false);
      try {
        filter.filterId = await mx.getOrCreateFilter(
          `FILTER_FILES_${mx.credentials.userId}`,
          filter
        );
        const timelineSet = room.getOrCreateFilteredTimelineSet(filter);
        
        syncFiles = async () => {
          if (!alive) return;
          syncCounter += 1;
          const syncId = syncCounter;
          const timeline = timelineSet.getLiveTimeline();

          // 尝试从本地/服务器加载，直到填满一定数量或到头
          while (timeline.getEvents().length < 100) {
            if (syncId !== syncCounter) return;

            // back-paginate 会先查本地 IndexedDB
            // eslint-disable-next-line no-await-in-loop
            const hasMore = await mx.paginateEventTimeline(timeline, { 
              backwards: true, 
              limit: 50 
            });
            
            if (!hasMore) break; // 彻底没数据了
          }

          if (syncId !== syncCounter) return;

          setFiles([...timeline.getEvents()].reverse());
        };

        await syncFiles();
      } catch {
        if (!alive) return;
        setError(true);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    loadFiles();

    const trySyncFiles = () => {
      syncFiles?.();
    };

    room.on(RoomEvent.Timeline, trySyncFiles);
    room.on(RoomEvent.Redaction, trySyncFiles);

    return () => {
      alive = false;
      room.removeListener(RoomEvent.Timeline, trySyncFiles);
      room.removeListener(RoomEvent.Redaction, trySyncFiles);
    };
  }, [room, mx, reloadKey]);

  const retry = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  return {
    files,
    loading,
    error,
    retry,
  };
};
