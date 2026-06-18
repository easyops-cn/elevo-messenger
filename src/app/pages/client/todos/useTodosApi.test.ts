import { Method } from 'matrix-js-sdk';
import type { MatrixClient } from 'matrix-js-sdk';
import { describe, expect, it, vi } from 'vitest';

import { fetchTodosPage, getTodosRequestParts } from './useTodosApi';

describe('todos API', () => {
  it('builds first page request parts with limit=20', () => {
    expect(getTodosRequestParts('https://matrix.example.test/_elevo/todos?foo=bar')).toEqual({
      baseUrl: 'https://matrix.example.test',
      path: '/_elevo/todos',
      queryParams: { foo: 'bar', limit: '20' },
    });
  });

  it('builds next page request parts with cursor', () => {
    expect(getTodosRequestParts('https://matrix.example.test/_elevo/todos', 'next-token')).toEqual({
      baseUrl: 'https://matrix.example.test',
      path: '/_elevo/todos',
      queryParams: { limit: '20', cursor: 'next-token' },
    });
  });

  it('uses mx.http.authedRequest instead of reading localStorage tokens', async () => {
    const getItem = vi.fn(() => {
      throw new Error('localStorage should not be read');
    });
    vi.stubGlobal('localStorage', { getItem });
    const response = { todos: [], next_cursor: null, prev_cursor: null };
    const mx = {
      http: {
        authedRequest: vi.fn().mockResolvedValue(response),
      },
    } as unknown as MatrixClient;

    await expect(
      fetchTodosPage(mx, 'https://matrix.example.test/_elevo/todos', 'next-token'),
    ).resolves.toBe(response);

    expect(mx.http.authedRequest).toHaveBeenCalledWith(
      Method.Get,
      '/_elevo/todos',
      { limit: '20', cursor: 'next-token' },
      undefined,
      { baseUrl: 'https://matrix.example.test', prefix: '' },
    );
    expect(getItem).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
