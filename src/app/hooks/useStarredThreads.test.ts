import { describe, expect, it } from 'vitest';
import { parseStarredThreadsContent } from './useStarredThreads';

describe('parseStarredThreadsContent', () => {
  it('returns valid starred thread entries', () => {
    expect(
      parseStarredThreadsContent({
        threads: [
          {
            roomId: '!room:example.org',
            threadId: '$thread',
            title: 'Release plan',
            starredAt: 1,
          },
        ],
      }),
    ).toEqual([
      {
        roomId: '!room:example.org',
        threadId: '$thread',
        title: 'Release plan',
        starredAt: 1,
      },
    ]);
  });

  it('filters invalid and duplicate entries', () => {
    expect(
      parseStarredThreadsContent({
        threads: [
          null,
          { roomId: '!room:example.org', threadId: '$bad' },
          { roomId: '!room:example.org', threadId: '$thread', starredAt: 1 },
          { roomId: '!room:example.org', threadId: '$thread', starredAt: 2 },
          { roomId: '!room:example.org', threadId: '$other', title: 42, starredAt: 3 },
        ],
      }),
    ).toEqual([{ roomId: '!room:example.org', threadId: '$thread', starredAt: 1 }]);
  });

  it('falls back to an empty list for unknown content', () => {
    expect(parseStarredThreadsContent(undefined)).toEqual([]);
    expect(parseStarredThreadsContent({ threads: {} })).toEqual([]);
  });
});
