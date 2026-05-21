/* eslint-disable no-param-reassign */
import produce from 'immer';
import { atom } from 'jotai';
import type { TodoItem } from '../../pages/client/todos/useTodosApi';

export type TodosAtomState = {
  apiItems: TodoItem[];
  liveItems: TodoItem[];
  nextCursor: string | null;
  initialized: boolean;
  isFetching: boolean;
  error: Error | null;
};

export type TodosAtomAction =
  | { type: 'SET_API_PAGE'; items: TodoItem[]; nextCursor: string | null; append: boolean }
  | { type: 'ADD_LIVE_ITEM'; item: TodoItem }
  | { type: 'REMOVE_BY_QUESTION_ID'; questionId: string }
  | { type: 'REMOVE_BY_EVENT'; roomId: string; eventId: string }
  | { type: 'SET_INITIALIZED' }
  | { type: 'SET_FETCHING'; isFetching: boolean }
  | { type: 'SET_ERROR'; error: Error | null }
  | { type: 'RESET' };

const baseTodosAtom = atom<TodosAtomState>({
  apiItems: [],
  liveItems: [],
  nextCursor: null,
  initialized: false,
  isFetching: false,
  error: null,
});

export const todosAtom = atom<TodosAtomState, [TodosAtomAction], undefined>(
  (get) => get(baseTodosAtom),
  (get, set, action) => {
    switch (action.type) {
      case 'SET_API_PAGE': {
        set(
          baseTodosAtom,
          produce(get(baseTodosAtom), (draft) => {
            if (action.append) {
              const existingIds = new Set(draft.apiItems.map((i) => i.question_event_id));
              const newItems = action.items.filter((i) => !existingIds.has(i.question_event_id));
              draft.apiItems.push(...newItems);
            } else {
              const liveIds = new Set(draft.liveItems.map((i) => i.question_event_id));
              draft.apiItems = action.items.filter((i) => !liveIds.has(i.question_event_id));
            }
            draft.nextCursor = action.nextCursor;
          })
        );
        return;
      }
      case 'ADD_LIVE_ITEM': {
        set(
          baseTodosAtom,
          produce(get(baseTodosAtom), (draft) => {
            const qid = action.item.question_event_id;
            const alreadyInApi = draft.apiItems.some((i) => i.question_event_id === qid);
            const alreadyInLive = draft.liveItems.some((i) => i.question_event_id === qid);
            if (!alreadyInApi && !alreadyInLive) {
              draft.liveItems.unshift(action.item);
            }
          })
        );
        return;
      }
      case 'REMOVE_BY_QUESTION_ID': {
        set(
          baseTodosAtom,
          produce(get(baseTodosAtom), (draft) => {
            draft.apiItems = draft.apiItems.filter((i) => i.question_event_id !== action.questionId);
            draft.liveItems = draft.liveItems.filter((i) => i.question_event_id !== action.questionId);
          })
        );
        return;
      }
      case 'REMOVE_BY_EVENT': {
        set(
          baseTodosAtom,
          produce(get(baseTodosAtom), (draft) => {
            draft.apiItems = draft.apiItems.filter(
              (i) => !(i.room_id === action.roomId && i.question_event_id === action.eventId)
            );
            draft.liveItems = draft.liveItems.filter(
              (i) => !(i.room_id === action.roomId && i.question_event_id === action.eventId)
            );
          })
        );
        return;
      }
      case 'SET_INITIALIZED':
        set(baseTodosAtom, produce(get(baseTodosAtom), (d) => { d.initialized = true; }));
        return;
      case 'SET_FETCHING':
        set(baseTodosAtom, produce(get(baseTodosAtom), (d) => { d.isFetching = action.isFetching; }));
        return;
      case 'SET_ERROR':
        set(baseTodosAtom, produce(get(baseTodosAtom), (d) => { d.error = action.error; }));
        return;
      case 'RESET':
        set(baseTodosAtom, {
          apiItems: [],
          liveItems: [],
          nextCursor: null,
          initialized: false,
          isFetching: false,
          error: null,
        });
    }
  }
);
