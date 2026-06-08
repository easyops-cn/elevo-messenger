import { describe, expect, it } from 'vitest';

import {
  getRecentUserMentionIds,
  putRecentUserMention,
  sanitizeRoomRecentUserMentions,
  sortByRecentUserIds,
  type RecentUserMentionStorage,
} from './recentUserMentions';

const createStorage = (): RecentUserMentionStorage => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe('recentUserMentions', () => {
  it('moves duplicate mentions to the front', () => {
    const storage = createStorage();

    putRecentUserMention('@alice:example.org', '!room:example.org', '@bob:example.org', storage, 1);
    putRecentUserMention(
      '@alice:example.org',
      '!room:example.org',
      '@carol:example.org',
      storage,
      2,
    );
    putRecentUserMention('@alice:example.org', '!room:example.org', '@bob:example.org', storage, 3);

    expect(getRecentUserMentionIds('@alice:example.org', '!room:example.org', storage)).toEqual([
      '@bob:example.org',
      '@carol:example.org',
    ]);
  });

  it('keeps recent mentions isolated per current user', () => {
    const storage = createStorage();

    putRecentUserMention('@alice:example.org', '!room:example.org', '@bob:example.org', storage, 1);
    putRecentUserMention('@dave:example.org', '!room:example.org', '@erin:example.org', storage, 1);

    expect(getRecentUserMentionIds('@alice:example.org', '!room:example.org', storage)).toEqual([
      '@bob:example.org',
    ]);
    expect(getRecentUserMentionIds('@dave:example.org', '!room:example.org', storage)).toEqual([
      '@erin:example.org',
    ]);
  });

  it('keeps recent mentions isolated per room', () => {
    const storage = createStorage();

    putRecentUserMention(
      '@alice:example.org',
      '!room-a:example.org',
      '@bob:example.org',
      storage,
      1,
    );
    putRecentUserMention(
      '@alice:example.org',
      '!room-b:example.org',
      '@carol:example.org',
      storage,
      1,
    );

    expect(getRecentUserMentionIds('@alice:example.org', '!room-a:example.org', storage)).toEqual([
      '@bob:example.org',
    ]);
    expect(getRecentUserMentionIds('@alice:example.org', '!room-b:example.org', storage)).toEqual([
      '@carol:example.org',
    ]);
  });

  it('keeps only the three most recent mentions', () => {
    const storage = createStorage();

    putRecentUserMention('@alice:example.org', '!room:example.org', '@bob:example.org', storage, 1);
    putRecentUserMention(
      '@alice:example.org',
      '!room:example.org',
      '@carol:example.org',
      storage,
      2,
    );
    putRecentUserMention(
      '@alice:example.org',
      '!room:example.org',
      '@dave:example.org',
      storage,
      3,
    );
    putRecentUserMention(
      '@alice:example.org',
      '!room:example.org',
      '@erin:example.org',
      storage,
      4,
    );

    expect(getRecentUserMentionIds('@alice:example.org', '!room:example.org', storage)).toEqual([
      '@erin:example.org',
      '@dave:example.org',
      '@carol:example.org',
    ]);
  });

  it('sanitizes invalid stored room mention records', () => {
    expect(
      sanitizeRoomRecentUserMentions({
        '!room:example.org': [
          { userId: '@bob:example.org', updatedAt: 1 },
          { userId: '@bob:example.org', updatedAt: 2 },
          { userId: '', updatedAt: 3 },
          { userId: '@carol:example.org', updatedAt: 'bad' },
          { userId: '@dave:example.org', updatedAt: 4 },
          { userId: '@erin:example.org', updatedAt: 5 },
        ],
        '!empty:example.org': [],
        '!bad:example.org': 'bad',
      }),
    ).toEqual({
      '!room:example.org': [
        { userId: '@bob:example.org', updatedAt: 1 },
        { userId: '@dave:example.org', updatedAt: 4 },
        { userId: '@erin:example.org', updatedAt: 5 },
      ],
    });
  });
});

describe('sortByRecentUserIds', () => {
  it('puts recent users first and keeps other items stable', () => {
    const items = [
      { userId: '@alice:example.org' },
      { userId: '@bob:example.org' },
      { userId: '@carol:example.org' },
      { userId: '@dave:example.org' },
    ];

    expect(
      sortByRecentUserIds(
        items,
        ['@carol:example.org', '@alice:example.org'],
        (item) => item.userId,
      ),
    ).toEqual([
      { userId: '@carol:example.org' },
      { userId: '@alice:example.org' },
      { userId: '@bob:example.org' },
      { userId: '@dave:example.org' },
    ]);
    expect(items).toEqual([
      { userId: '@alice:example.org' },
      { userId: '@bob:example.org' },
      { userId: '@carol:example.org' },
      { userId: '@dave:example.org' },
    ]);
  });
});
