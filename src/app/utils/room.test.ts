import { describe, expect, it } from 'vitest';

import { trimThreadSummaryPrefix } from './room';

describe('trimThreadSummaryPrefix', () => {
  it('removes thread commands from the start of a summary', () => {
    expect(trimThreadSummaryPrefix('/thread summarize this discussion')).toBe(
      'summarize this discussion',
    );
    expect(trimThreadSummaryPrefix('/plan create next steps')).toBe('create next steps');
  });

  it('removes leading room, user, room alias, room id, and event mentions', () => {
    expect(trimThreadSummaryPrefix('@room check this')).toBe('check this');
    expect(trimThreadSummaryPrefix('@alice:example.org check this')).toBe('check this');
    expect(trimThreadSummaryPrefix('#room:example.org check this')).toBe('check this');
    expect(trimThreadSummaryPrefix('!roomId:example.org check this')).toBe('check this');
    expect(trimThreadSummaryPrefix('$eventId:example.org check this')).toBe('check this');
  });

  it('removes multiple prefix tokens before the actual summary', () => {
    expect(trimThreadSummaryPrefix('  /thread @room @alice:example.org   hello world')).toBe(
      'hello world',
    );
  });

  it('preserves the original summary when no prefix token is consumed', () => {
    expect(trimThreadSummaryPrefix('hello /thread @room')).toBe('hello /thread @room');
    expect(trimThreadSummaryPrefix('   hello world')).toBe('   hello world');
  });

  it('preserves the original summary when prefix tokens leave no body', () => {
    expect(trimThreadSummaryPrefix('/thread @room')).toBe('/thread @room');
  });

  it('does not skip across newlines while trimming prefix whitespace', () => {
    expect(trimThreadSummaryPrefix('/thread\nhello world')).toBe('hello world');
  });
});
