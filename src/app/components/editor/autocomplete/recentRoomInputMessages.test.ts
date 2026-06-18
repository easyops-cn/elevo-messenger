import { describe, expect, it } from 'vitest';

import {
  getRoomInputRecentMessages,
  putRoomInputRecentMessage,
  sanitizeRoomInputRecentMessages,
  type RecentRoomInputMessageStorage,
} from './recentRoomInputMessages';

const createStorage = (): RecentRoomInputMessageStorage => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
};

describe('recentRoomInputMessages', () => {
  it('moves duplicate messages to the front', () => {
    const storage = createStorage();

    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'First' },
      storage,
      1,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Second' },
      storage,
      2,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'First' },
      storage,
      3,
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room:example.org', undefined, storage),
    ).toEqual([
      { body: 'First', updatedAt: 3 },
      { body: 'Second', updatedAt: 2 },
    ]);
  });

  it('keeps recent messages isolated per current user', () => {
    const storage = createStorage();

    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Alice message' },
      storage,
      1,
    );
    putRoomInputRecentMessage(
      '@bob:example.org',
      '!room:example.org',
      undefined,
      { body: 'Bob message' },
      storage,
      2,
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room:example.org', undefined, storage),
    ).toEqual([{ body: 'Alice message', updatedAt: 1 }]);
    expect(
      getRoomInputRecentMessages('@bob:example.org', '!room:example.org', undefined, storage),
    ).toEqual([{ body: 'Bob message', updatedAt: 2 }]);
  });

  it('keeps recent messages isolated per room', () => {
    const storage = createStorage();

    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room-a:example.org',
      undefined,
      { body: 'Room A message' },
      storage,
      1,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room-b:example.org',
      undefined,
      { body: 'Room B message' },
      storage,
      2,
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room-a:example.org', undefined, storage),
    ).toEqual([{ body: 'Room A message', updatedAt: 1 }]);
    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room-b:example.org', undefined, storage),
    ).toEqual([{ body: 'Room B message', updatedAt: 2 }]);
  });

  it('keeps main timeline and thread messages isolated', () => {
    const storage = createStorage();

    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Main message' },
      storage,
      1,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      '$thread:example.org',
      { body: 'Thread message' },
      storage,
      2,
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room:example.org', undefined, storage),
    ).toEqual([{ body: 'Main message', updatedAt: 1 }]);
    expect(
      getRoomInputRecentMessages(
        '@alice:example.org',
        '!room:example.org',
        '$thread:example.org',
        storage,
      ),
    ).toEqual([{ body: 'Thread message', updatedAt: 2 }]);
  });

  it('keeps only the ten most recent messages', () => {
    const storage = createStorage();

    Array.from({ length: 11 }, (_, index) =>
      putRoomInputRecentMessage(
        '@alice:example.org',
        '!room:example.org',
        undefined,
        { body: `Message ${index + 1}` },
        storage,
        index + 1,
      ),
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room:example.org', undefined, storage).map(
        (entry) => entry.body,
      ),
    ).toEqual([
      'Message 11',
      'Message 10',
      'Message 9',
      'Message 8',
      'Message 7',
      'Message 6',
      'Message 5',
      'Message 4',
      'Message 3',
      'Message 2',
    ]);
  });

  it('ignores empty bodies and invalid stored records', () => {
    const storage = createStorage();

    expect(
      putRoomInputRecentMessage(
        '@alice:example.org',
        '!room:example.org',
        undefined,
        { body: '   ' },
        storage,
        1,
      ),
    ).toEqual([]);

    expect(
      sanitizeRoomInputRecentMessages([
        { body: 'Valid', updatedAt: 1 },
        { body: 'Valid', updatedAt: 2 },
        { body: '', updatedAt: 3 },
        { body: 'Bad date', updatedAt: 'bad' },
        { body: 'Bad html', formattedBody: 1, updatedAt: 4 },
        { body: 'Formatted', formattedBody: '<strong>Formatted</strong>', updatedAt: 5 },
      ]),
    ).toEqual([
      { body: 'Valid', updatedAt: 1 },
      { body: 'Formatted', formattedBody: '<strong>Formatted</strong>', updatedAt: 5 },
    ]);
  });

  it('deduplicates by body and formatted body together', () => {
    const storage = createStorage();

    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Hello' },
      storage,
      1,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Hello', formattedBody: '<strong>Hello</strong>' },
      storage,
      2,
    );
    putRoomInputRecentMessage(
      '@alice:example.org',
      '!room:example.org',
      undefined,
      { body: 'Hello' },
      storage,
      3,
    );

    expect(
      getRoomInputRecentMessages('@alice:example.org', '!room:example.org', undefined, storage),
    ).toEqual([
      { body: 'Hello', updatedAt: 3 },
      { body: 'Hello', formattedBody: '<strong>Hello</strong>', updatedAt: 2 },
    ]);
  });
});
