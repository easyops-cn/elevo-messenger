import { type StarredThreadEntry } from '../../../types/matrix/accountData';
import { type RoomThread } from '../../hooks/useRoomThreads';

export const sortThreadsForPanel = (
  threads: RoomThread[],
  starredThreads: StarredThreadEntry[],
): RoomThread[] => {
  const starredAtByThreadId = new Map(
    starredThreads.map((entry) => [entry.threadId, entry.starredAt]),
  );

  return [...threads].sort((a, b) => {
    const aStarredAt = starredAtByThreadId.get(a.id);
    const bStarredAt = starredAtByThreadId.get(b.id);
    const aStarred = aStarredAt !== undefined;
    const bStarred = bStarredAt !== undefined;
    if (aStarred !== bStarred) return aStarred ? -1 : 1;
    if (aStarredAt !== undefined && bStarredAt !== undefined && aStarredAt !== bStarredAt) {
      return bStarredAt - aStarredAt;
    }

    const aTs = a.replyToEvent?.getTs() ?? a.rootEvent?.getTs() ?? 0;
    const bTs = b.replyToEvent?.getTs() ?? b.rootEvent?.getTs() ?? 0;
    return bTs - aTs;
  });
};
