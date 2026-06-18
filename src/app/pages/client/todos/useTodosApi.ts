import { useInfiniteQuery } from '@tanstack/react-query';
import type { MatrixClient } from 'matrix-js-sdk';
import { Method } from 'matrix-js-sdk';
import { useElevoConfig } from '../../../hooks/useElevoConfig';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import type { AskUserQuestionData } from '../../../components/message';

export type TodoItem = {
  room_id: string;
  question_event_id: string;
  thread_root_id?: string;
  sender: string;
  assignee: string;
  question: AskUserQuestionData;
  created_at: number;
};

export type TodosResponse = {
  todos: TodoItem[];
  next_cursor: string | null;
  prev_cursor: string | null;
};

export function getTodosRequestParts(apiUrl: string, cursor?: string) {
  const url = new URL(apiUrl);
  url.searchParams.set('limit', '20');
  if (cursor) url.searchParams.set('cursor', cursor);
  else url.searchParams.delete('cursor');

  const queryParams = Object.fromEntries(url.searchParams.entries());
  return {
    baseUrl: url.origin,
    path: url.pathname,
    queryParams,
  };
}

export async function fetchTodosPage(
  mx: MatrixClient,
  apiUrl: string,
  cursor?: string,
): Promise<TodosResponse> {
  const { baseUrl, path, queryParams } = getTodosRequestParts(apiUrl, cursor);
  return mx.http.authedRequest<TodosResponse>(Method.Get, path, queryParams, undefined, {
    baseUrl,
    prefix: '',
  });
}

export function useTodosApi() {
  const mx = useMatrixClient();
  const { todos } = useElevoConfig();
  const apiUrl = todos?.api;

  return useInfiniteQuery({
    queryKey: ['todos'],
    queryFn: async ({ pageParam }) => {
      if (!apiUrl) throw new Error('Todos API URL is not configured');
      return fetchTodosPage(mx, apiUrl, pageParam || undefined);
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.prev_cursor ?? undefined,
    enabled: !!apiUrl,
  });
}
