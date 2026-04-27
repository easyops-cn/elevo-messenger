import { useCallback, useMemo } from 'react';
import { useSetting } from './hooks/settings';
import { settingsAtom } from './settings';

export type ThreadChatState = {
  open: boolean;
  threadRootId?: string;
};

const DEFAULT_THREAD_CHAT: ThreadChatState = { open: false };

export function useThreadChat(roomId: string): [ThreadChatState, (state: ThreadChatState) => void] {
  const [threadChatStates, setThreadChatStates] = useSetting(settingsAtom, 'threadChatStates');

  const state: ThreadChatState = threadChatStates[roomId] ?? DEFAULT_THREAD_CHAT;

  const setState = useCallback(
    (newState: ThreadChatState) => {
      setThreadChatStates((prev) => ({
        ...prev,
        [roomId]: newState,
      }));
    },
    [roomId, setThreadChatStates]
  );

  return useMemo(() => [state, setState], [state, setState]);
}
