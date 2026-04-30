import { useCallback, useEffect, useState } from 'react';
import { Direction, Filter, MatrixEvent, MsgType, Room, RoomEvent } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { MessageEvent } from '../../types/matrix/room';

type UseRoomFilesResult = {
  files: MatrixEvent[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

const ALLOWED_FILE_MSG_TYPES: Set<string> = new Set([
  MsgType.File,
  MsgType.Image,
  MsgType.Audio,
  MsgType.Video,
]);

const paginateBackwardCache = new Set<string>();

function filterFileEvents(events: MatrixEvent[]): MatrixEvent[] {
  return events.filter((evt) => {
    if (evt.isRedacted()) return false;
      const eventType = evt.getType();
      if (eventType !== MessageEvent.RoomMessage && eventType !== MessageEvent.RoomMessageEncrypted) return false;

      const msgtype = evt.getContent()?.msgtype;
      return typeof msgtype === 'string' && ALLOWED_FILE_MSG_TYPES.has(msgtype);
  });
}

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

          const hasTriedPaginate = paginateBackwardCache.has(room.roomId);
          paginateBackwardCache.add(room.roomId);

          syncCounter += 1;
          const syncId = syncCounter;
          const timeline = timelineSet.getLiveTimeline();
          let validEvents = filterFileEvents(timeline.getEvents());

          if (!hasTriedPaginate && timeline.getPaginationToken(Direction.Backward)) {
            // Try to load from local/server until we have enough or reach the end
            let count = 0;
            while (validEvents.length < 10) {
              if (syncId !== syncCounter) return;
              if (count > 5) break;

              count += 1;

              // back-paginate will first check local IndexedDB
              // eslint-disable-next-line no-await-in-loop
              const hasMore = await mx.paginateEventTimeline(timeline, { 
                backwards: true, 
                limit: 50 
              });

              validEvents = filterFileEvents(timeline.getEvents());
              
              if (!hasMore) break;
            }
          }

          if (syncId !== syncCounter) return;

          setFiles(validEvents.reverse());
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
