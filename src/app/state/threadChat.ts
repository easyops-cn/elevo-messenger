import { atom } from 'jotai';

export type ThreadChatState = {
  open: boolean;
  threadRootId?: string;
};

export const threadChatAtom = atom<ThreadChatState>({
  open: false,
});
