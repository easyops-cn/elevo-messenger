/* eslint-disable no-continue */
import { MatrixEvent, Room, RoomEvent } from 'matrix-js-sdk';
import { useCallback, useEffect, useState } from 'react';
import { MessageEvent } from '../../types/matrix/room';
import { reactionOrEditEvent } from '../utils/room';
import { useDebounce } from './useDebounce';

const CONTENTFUL_EVENT_TYPES = new Set<string>([
  MessageEvent.RoomMessage,
  MessageEvent.RoomMessageEncrypted,
  MessageEvent.Sticker,
]);

export const useRoomLatestContentfulEvent = (room: Room) => {
  const [latestEvent, setLatestEvent] = useState<MatrixEvent>();

  const debouncedUpdateLatestEvent = useDebounce(
    useCallback(() => {
      const getLatestEvent = (): MatrixEvent | undefined => {
        const liveEvents = room.getLiveTimeline().getEvents();
        for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
          const evt = liveEvents[i];

          if (!evt) continue;
          if (evt.isRedacted()) continue;
          if (reactionOrEditEvent(evt)) continue;
          if (CONTENTFUL_EVENT_TYPES.has(evt.getType())) {
            return evt;
          }
        }
        return undefined;
      };
      setLatestEvent(getLatestEvent());
    }, [room]),
    { wait: 100 }
  );

  useEffect(() => {
    debouncedUpdateLatestEvent();

    room.on(RoomEvent.Timeline, debouncedUpdateLatestEvent);
    room.on(RoomEvent.Redaction, debouncedUpdateLatestEvent);
    return () => {
      room.removeListener(RoomEvent.Timeline, debouncedUpdateLatestEvent);
      room.removeListener(RoomEvent.Redaction, debouncedUpdateLatestEvent);
    };
  }, [room, debouncedUpdateLatestEvent]);

  return latestEvent;
};
