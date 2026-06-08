import { useCallback, useEffect, useState } from 'react';
import {
  MatrixEvent,
  RelationType,
  Room,
  RoomEvent,
  type RoomEventHandlerMap,
} from 'matrix-js-sdk';
import { RelationsEvent } from 'matrix-js-sdk/lib/models/relations';
import { MessageEvent } from '../../types/matrix/room';
import { getLatestThreadTopic, getThreadTopicRelations } from '../utils/room';

const THREAD_TOPIC_RELATIONS_LIMIT = 20;

export const useThreadTopic = (
  room: Room,
  rootEvent: MatrixEvent | undefined,
): string | undefined => {
  const rootEventId = rootEvent?.getId();

  const readTopic = useCallback(
    (extraEvents: MatrixEvent[] = []) => {
      if (!rootEventId) return undefined;
      const relations = getThreadTopicRelations(room, rootEventId);
      return getLatestThreadTopic(rootEvent, [
        ...(relations?.getRelations() ?? []),
        ...extraEvents,
      ]);
    },
    [room, rootEvent, rootEventId],
  );

  const [topic, setTopic] = useState(() => readTopic());

  useEffect(() => {
    setTopic(readTopic());
  }, [readTopic]);

  useEffect(() => {
    if (!rootEventId) return undefined;

    let disposed = false;
    const updateTopic = (extraEvents: MatrixEvent[] = []) => {
      if (!disposed) setTopic(readTopic(extraEvents));
    };

    const handleRelationsUpdate = () => updateTopic();
    const subscribedRelations = new Set<NonNullable<ReturnType<typeof getThreadTopicRelations>>>();

    const subscribeRelations = () => {
      const relations = getThreadTopicRelations(room, rootEventId);
      if (!relations || subscribedRelations.has(relations)) return;
      subscribedRelations.add(relations);
      relations.on(RelationsEvent.Add, handleRelationsUpdate);
      relations.on(RelationsEvent.Redaction, handleRelationsUpdate);
      relations.on(RelationsEvent.Remove, handleRelationsUpdate);
    };

    subscribeRelations();

    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (event) => {
      if (event.getType() === MessageEvent.ThreadTopic && event.getAssociatedId() === rootEventId) {
        room.relations.aggregateChildEvent(event);
        subscribeRelations();
        updateTopic([event]);
      }
    };
    room.on(RoomEvent.Timeline, handleTimelineEvent);

    room.client
      .relations(room.roomId, rootEventId, RelationType.Reference, MessageEvent.ThreadTopic, {
        limit: THREAD_TOPIC_RELATIONS_LIMIT,
      })
      .then(({ events }) => {
        if (disposed) return;
        events.forEach((event) => room.relations.aggregateChildEvent(event));
        subscribeRelations();
        updateTopic(events);
      })
      .catch(() => {
        updateTopic();
      });

    return () => {
      disposed = true;
      subscribedRelations.forEach((relations) => {
        relations.removeListener(RelationsEvent.Add, handleRelationsUpdate);
        relations.removeListener(RelationsEvent.Redaction, handleRelationsUpdate);
        relations.removeListener(RelationsEvent.Remove, handleRelationsUpdate);
      });
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [readTopic, room, rootEventId]);

  return topic;
};
