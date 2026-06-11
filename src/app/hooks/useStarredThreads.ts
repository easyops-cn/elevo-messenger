import { useCallback, useMemo } from 'react';
import { AccountDataEvent, StarredThreadEntry } from '../../types/matrix/accountData';
import { useAccountData } from './useAccountData';
import { useMatrixClient } from './useMatrixClient';

const isValidEntry = (entry: unknown): entry is StarredThreadEntry => {
  if (!entry || typeof entry !== 'object') return false;

  const candidate = entry as Partial<StarredThreadEntry>;
  return (
    typeof candidate.roomId === 'string' &&
    typeof candidate.threadId === 'string' &&
    typeof candidate.starredAt === 'number' &&
    (candidate.title === undefined || typeof candidate.title === 'string')
  );
};

export const parseStarredThreadsContent = (content: unknown): StarredThreadEntry[] => {
  if (!content || typeof content !== 'object') return [];

  const threads = (content as { threads?: unknown }).threads;
  if (!Array.isArray(threads)) return [];

  const seen = new Set<string>();
  return threads.filter((entry): entry is StarredThreadEntry => {
    if (!isValidEntry(entry)) return false;

    const key = `${entry.roomId}:${entry.threadId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function useStarredThreads(): StarredThreadEntry[] {
  const event = useAccountData(AccountDataEvent.StarredThreads);

  return useMemo(() => parseStarredThreadsContent(event?.getContent()), [event]);
}

export function useStarredThreadsByRoom(roomId: string) {
  const starredThreads = useStarredThreads();

  return useMemo(() => {
    const threads = starredThreads.filter((entry) => entry.roomId === roomId);
    return {
      threads,
      threadIds: new Set(threads.map((entry) => entry.threadId)),
    };
  }, [roomId, starredThreads]);
}

export function useToggleStarredThread() {
  const mx = useMatrixClient();
  const starredThreads = useStarredThreads();

  const isStarred = useCallback(
    (roomId: string, threadId: string) =>
      starredThreads.some((entry) => entry.roomId === roomId && entry.threadId === threadId),
    [starredThreads],
  );

  const toggle = useCallback(
    async (roomId: string, threadId: string, title?: string) => {
      const latest = parseStarredThreadsContent(
        mx.getAccountData(AccountDataEvent.StarredThreads)?.getContent(),
      );
      const existingIndex = latest.findIndex(
        (entry) => entry.roomId === roomId && entry.threadId === threadId,
      );
      const next =
        existingIndex >= 0
          ? latest.filter((_, index) => index !== existingIndex)
          : [
              ...latest,
              {
                roomId,
                threadId,
                title: title?.trim() || undefined,
                starredAt: Date.now(),
              },
            ];

      await mx.setAccountData(AccountDataEvent.StarredThreads, { threads: next });
    },
    [mx],
  );

  return { starredThreads, isStarred, toggle };
}
