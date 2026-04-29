/* eslint-disable no-continue */
import { MatrixEvent, Room, RoomEvent } from 'matrix-js-sdk';
import { useCallback, useEffect, useState } from 'react';
import { MessageEvent } from '../../types/matrix/room';
import { reactionOrEditEvent } from '../utils/room';
import { useDebounce } from './useDebounce';
import { useMatrixClient } from './useMatrixClient';

const CONTENTFUL_EVENT_TYPES = new Set<string>([
  MessageEvent.RoomMessage,
  MessageEvent.RoomMessageEncrypted,
  MessageEvent.Sticker,
]);

export const useRoomLatestContentfulEvent = (room: Room) => {
  const mx = useMatrixClient();
  const [latestEvent, setLatestEvent] = useState<MatrixEvent>();

  const debouncedUpdateLatestEvent = useDebounce(
    useCallback(async () => {
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

      const latest = getLatestEvent();
      
      if (latest) {
        setLatestEvent(latest);
      } else {
        // If no contentful event is found, try paginating to find one.
        // This can happen in rooms with a lot of non-contentful events
        // at the end of the timeline.
        await mx.paginateEventTimeline(room.getLiveTimeline(), {
          backwards: true,
          limit: 30,
        });
        setLatestEvent(getLatestEvent());
      }
    }, [mx, room]),
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
