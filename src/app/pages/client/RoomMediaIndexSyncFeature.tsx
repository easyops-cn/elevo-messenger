import { useEffect } from 'react';
import { RoomEvent, type RoomEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import {
  migrateRoomMediaIndexFromLoadedTimelines,
  removeRoomMediaEvent,
  replaceRoomMediaEventId,
  upsertRoomMediaEvent,
} from '../../utils/roomMediaIndex';

const getRedactedEventId = (mEvent: Parameters<RoomEventHandlerMap[RoomEvent.Redaction]>[0]) => {
  const redacts = mEvent.event.redacts;
  if (typeof redacts === 'string') return redacts;

  const relation = mEvent.getRelation();
  return relation?.rel_type === 'm.reference' && typeof relation.event_id === 'string'
    ? relation.event_id
    : undefined;
};

export function RoomMediaIndexSyncFeature() {
  const mx = useMatrixClient();

  useEffect(() => {
    if (!isDesktopTauri) return undefined;

    migrateRoomMediaIndexFromLoadedTimelines(mx).catch(() => {
      // Best-effort one-time local migration.
    });

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      room,
      _toStartOfTimeline,
      _removed,
      data,
    ) => {
      if (!room?.roomId || room.isSpaceRoom()) return;

      if (mEvent.isRedaction()) {
        const redactedEventId = getRedactedEventId(mEvent);
        if (redactedEventId) {
          removeRoomMediaEvent(room.roomId, redactedEventId).catch(() => {
            // Best-effort local index update.
          });
        }
        return;
      }

      if (!data.liveEvent) return;

      upsertRoomMediaEvent(room.roomId, mEvent).catch(() => {
        // Best-effort local index update.
      });
    };

    const handleRedaction: RoomEventHandlerMap[RoomEvent.Redaction] = (mEvent, room) => {
      const redactedEventId = getRedactedEventId(mEvent);
      if (!room?.roomId || !redactedEventId) return;
      removeRoomMediaEvent(room.roomId, redactedEventId).catch(() => {
        // Best-effort local index update.
      });
    };

    const handleLocalEchoUpdated: RoomEventHandlerMap[RoomEvent.LocalEchoUpdated] = (
      mEvent,
      room,
      oldEventId,
    ) => {
      if (!room?.roomId || room.isSpaceRoom() || !oldEventId) return;
      replaceRoomMediaEventId(room.roomId, oldEventId, mEvent).catch(() => {
        // Best-effort local index update.
      });
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    mx.on(RoomEvent.Redaction, handleRedaction);
    mx.on(RoomEvent.LocalEchoUpdated, handleLocalEchoUpdated);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      mx.removeListener(RoomEvent.Redaction, handleRedaction);
      mx.removeListener(RoomEvent.LocalEchoUpdated, handleLocalEchoUpdated);
    };
  }, [mx]);

  return null;
}
