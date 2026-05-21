import { useInfiniteQuery } from '@tanstack/react-query';
import { useElevoConfig } from '../../../hooks/useElevoConfig';
import type { AskUserQuestionData } from '../../../components/message';

export type TodoItem = {
  room_id: string;
  question_event_id: string;
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

export function useTodosApi() {
  const { todos } = useElevoConfig();
  const apiUrl = todos?.api;

  return useInfiniteQuery({
    queryKey: ['todos'],
    queryFn: async ({ pageParam }) => {
      const token = localStorage.getItem('elevo_access_token');
      if (!token) throw new Error('No access token');

      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam);

      const res = await fetch(`${apiUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`Todos API error: ${res.status}`);
      return res.json() as Promise<TodosResponse>;
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    getPreviousPageParam: (firstPage) => firstPage.prev_cursor ?? undefined,
    enabled: !!apiUrl,
  });
}
