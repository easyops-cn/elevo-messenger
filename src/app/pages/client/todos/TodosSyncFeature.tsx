import React, { useCallback, useEffect, useRef } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { RoomEvent, type RoomEventHandlerMap } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useElevoConfig } from '../../../hooks/useElevoConfig';
import { todosAtom } from '../../../state/todos/todosAtom';
import type { TodoItem, TodosResponse } from './useTodosApi';
import { parseToolCall, getAskHumanForRender, getAskHumanAnswersForRender } from '../../../components/message';

function TodosApiSync() {
  const setTodos = useSetAtom(todosAtom);
  const { todos } = useElevoConfig();
  const apiUrl = todos?.api;

  useEffect(() => {
    if (!apiUrl) return;
    let cancelled = false;

    const fetchFirstPage = async () => {
      setTodos({ type: 'SET_FETCHING', isFetching: true });
      setTodos({ type: 'SET_ERROR', error: null });
      try {
        const token = localStorage.getItem('elevo_access_token');
        if (!token) throw new Error('No access token');
        const params = new URLSearchParams({ limit: '20' });
        const res = await fetch(`${apiUrl}?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error(`Todos API error: ${res.status}`);
        const data: TodosResponse = await res.json();
        if (!cancelled) {
          setTodos({ type: 'SET_API_PAGE', items: data.todos, nextCursor: data.next_cursor, append: false });
          setTodos({ type: 'SET_INITIALIZED' });
        }
      } catch (err) {
        if (!cancelled) {
          setTodos({ type: 'SET_ERROR', error: err instanceof Error ? err : new Error(String(err)) });
        }
      } finally {
        if (!cancelled) {
          setTodos({ type: 'SET_FETCHING', isFetching: false });
        }
      }
    };

    fetchFirstPage();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, setTodos]);

  useEffect(() => () => {
    setTodos({ type: 'RESET' });
  }, [setTodos]);

  return null;
}

export function useFetchTodosNextPage() {
  const setTodos = useSetAtom(todosAtom);
  const todosState = useAtomValue(todosAtom);
  const { todos } = useElevoConfig();
  const apiUrl = todos?.api;
  const fetchingRef = useRef(false);

  return useCallback(async () => {
    if (!apiUrl || !todosState.nextCursor || fetchingRef.current || todosState.isFetching) return;
    fetchingRef.current = true;
    setTodos({ type: 'SET_FETCHING', isFetching: true });
    try {
      const token = localStorage.getItem('elevo_access_token');
      if (!token) throw new Error('No access token');
      const params = new URLSearchParams({ limit: '20', cursor: todosState.nextCursor });
      const res = await fetch(`${apiUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Todos API error: ${res.status}`);
      const data: TodosResponse = await res.json();
      setTodos({ type: 'SET_API_PAGE', items: data.todos, nextCursor: data.next_cursor, append: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch todos next page:', err);
    } finally {
      fetchingRef.current = false;
      setTodos({ type: 'SET_FETCHING', isFetching: false });
    }
  }, [apiUrl, todosState.nextCursor, todosState.isFetching, setTodos]);
}

function TodosTimelineSync() {
  const mx = useMatrixClient();
  const setTodos = useSetAtom(todosAtom);

  useEffect(() => {
    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      room,
      _toStart,
      _removed,
      data
    ) => {
      if (!data.liveEvent || !room) return;

      // Handle redaction
      if (mEvent.isRedaction()) {
        const redactedEventId = mEvent.event.redacts;
        if (redactedEventId) {
          setTodos({ type: 'REMOVE_BY_EVENT', roomId: room.roomId, eventId: redactedEventId });
        }
        return;
      }

      if (mEvent.getType() !== 'm.room.message') return;

      const content = mEvent.getContent();
      if (!content) return;

      const relation = mEvent.getRelation();
      const isReplace = relation?.rel_type === 'm.replace';
      const toolCall = parseToolCall(isReplace ? content['m.new_content'] : content);

      if (toolCall) {
        const eventId = mEvent.getId();
        const originalEventId = isReplace ? relation.event_id : eventId;

        const askHumanAnswers = getAskHumanAnswersForRender(toolCall, originalEventId);

        // Remove todo when askHuman question is answered
        if (askHumanAnswers) {
          setTodos({ type: 'REMOVE_BY_QUESTION_ID', questionId: askHumanAnswers.question_event_id });
          return;
        }

        // Skip m.replace events for adding (the original event already handled it)
        if (isReplace) return;

        const askHuman = getAskHumanForRender(toolCall);
        // Add todo when askHuman question is pending for current user
        if (askHuman && eventId) {
          const assignee =
            typeof content['vip.elevo.initial_human_sender'] === 'string'
              ? content['vip.elevo.initial_human_sender']
              : undefined;
          if (assignee && assignee === mx.getUserId()) {
            const sender = mEvent.getSender();
            if (sender) {
              const todoItem: TodoItem = {
                room_id: room.roomId,
                question_event_id: eventId,
                sender,
                assignee,
                question: askHuman.question,
                created_at: Math.floor(mEvent.getTs() / 1000),
              };
              setTodos({ type: 'ADD_LIVE_ITEM', item: todoItem });
            }
          }
        }
      }
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, setTodos]);

  return null;
}

export function TodosSyncFeature() {
  return (
    <>
      <TodosApiSync />
      <TodosTimelineSync />
    </>
  );
}
