import { describe, expect, it } from 'vitest';
import { type RoomThread } from '../../hooks/useRoomThreads';
import { sortThreadsForPanel } from './sortThreadsForPanel';

const thread = (id: string, ts: number): RoomThread =>
  ({
    id,
    replyToEvent: {
      getTs: () => ts,
    },
  }) as RoomThread;

describe('sortThreadsForPanel', () => {
  it('sorts starred threads by starred time descending before unstarred threads', () => {
    const threads = [
      thread('$old-star', 300),
      thread('$unstarred', 1000),
      thread('$new-star', 100),
    ];

    expect(
      sortThreadsForPanel(threads, [
        { roomId: '!room:example.org', threadId: '$old-star', starredAt: 100 },
        { roomId: '!room:example.org', threadId: '$new-star', starredAt: 200 },
      ]).map((entry) => entry.id),
    ).toEqual(['$new-star', '$old-star', '$unstarred']);
  });

  it('sorts unstarred threads by latest message time descending', () => {
    const threads = [thread('$older', 100), thread('$newer', 300), thread('$middle', 200)];

    expect(sortThreadsForPanel(threads, []).map((entry) => entry.id)).toEqual([
      '$newer',
      '$middle',
      '$older',
    ]);
  });
});
