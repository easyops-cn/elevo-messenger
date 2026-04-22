/* eslint-disable no-continue */
import { MatrixEvent, Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { MessageEvent } from '../../types/matrix/room';
import { reactionOrEditEvent } from '../utils/room';

const CONTENTFUL_EVENT_TYPES = new Set<string>([
  MessageEvent.RoomMessage,
  MessageEvent.RoomMessageEncrypted,
  MessageEvent.Sticker,
]);

export const useRoomLatestContentfulEvent = (room: Room) => {
  const [latestEvent, setLatestEvent] = useState<MatrixEvent>();

  useEffect(() => {
    const getLatestEvent = (): MatrixEvent | undefined => {
      const liveEvents = room.getLiveTimeline().getEvents();
      for (let i = liveEvents.length - 1; i >= 0; i -= 1) {
        const evt = liveEvents[i];

        if (!evt) continue;
        if (reactionOrEditEvent(evt)) continue;
        if (CONTENTFUL_EVENT_TYPES.has(evt.getType())) {
          return evt;
        }
      }
      return undefined;
    };

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = () => {
      setLatestEvent(getLatestEvent());
    };
    setLatestEvent(getLatestEvent());

    room.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [room]);

  return latestEvent;
};
