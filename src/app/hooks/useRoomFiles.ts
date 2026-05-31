import { useCallback, useEffect, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { isDesktopTauri } from '../plugins/useTauriOpener';
import {
  deleteRoomMediaEvent,
  listRoomMediaEntries,
  removeRoomMediaEvent,
  subscribeRoomMediaIndex,
  type RoomMediaEntry,
} from '../utils/roomMediaIndex';

type UseRoomFilesResult = {
  files: RoomMediaEntry[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export const useRoomFiles = (room: Room, limit?: number): UseRoomFilesResult => {
  const [files, setFiles] = useState<RoomMediaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;

    if (!isDesktopTauri || !room || room.isSpaceRoom()) {
      setFiles([]);
      setLoading(false);
      setError(false);
      return () => {
        alive = false;
      };
    }

    const syncFiles = async () => {
      if (!alive) return;
      setLoading(true);
      setError(false);
      try {
        let entries = await listRoomMediaEntries(room.roomId, limit);
        const staleEntries = entries.filter((entry) => {
          const event = room.findEventById(entry.eventId);
          return event?.isRedacted() || (entry.eventId.startsWith('~') && !event);
        });
        if (staleEntries.length > 0) {
          await Promise.all(
            staleEntries.map((entry) =>
              entry.eventId.startsWith('~')
                ? deleteRoomMediaEvent(room.roomId, entry.eventId)
                : removeRoomMediaEvent(room.roomId, entry.eventId),
            ),
          );
          entries = entries.filter((entry) => !staleEntries.includes(entry));
        }
        if (!alive) return;
        setFiles(entries);
      } catch {
        if (!alive) return;
        setError(true);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    syncFiles();

    const unsubscribe = subscribeRoomMediaIndex(room.roomId, syncFiles);

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [room, reloadKey, limit]);

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
