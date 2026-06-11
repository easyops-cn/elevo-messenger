import { describe, expect, it } from 'vitest';
import { RelationType, type MatrixEvent } from 'matrix-js-sdk';
import { MessageEvent } from '../../types/matrix/room';

import { getLatestThreadTopic, getThreadTopicContent, trimThreadSummaryPrefix } from './room';

const makeEvent = ({
  eventId = '$event',
  type = MessageEvent.ThreadTopic,
  sender = '@alice:example.org',
  ts = 1,
  topic,
  associatedId = '$root',
  redacted = false,
}: {
  eventId?: string;
  type?: string;
  sender?: string;
  ts?: number;
  topic?: unknown;
  associatedId?: string;
  redacted?: boolean;
}): MatrixEvent =>
  ({
    getId: () => eventId,
    getType: () => type,
    getSender: () => sender,
    getTs: () => ts,
    getAssociatedId: () => associatedId,
    getContent: () => ({ topic }),
    isRedacted: () => redacted,
  }) as MatrixEvent;

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

describe('thread topic helpers', () => {
  it('builds thread topic content with a reference relation', () => {
    expect(getThreadTopicContent('$root', '  Release plan  ')).toEqual({
      topic: 'Release plan',
      'm.relates_to': {
        event_id: '$root',
        rel_type: RelationType.Reference,
      },
    });
  });

  it('selects the latest non-empty topic from the thread root sender', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({ eventId: '$old', sender: '@alice:example.org', ts: 10, topic: 'Old topic' }),
      makeEvent({ eventId: '$ignored', sender: '@bob:example.org', ts: 30, topic: 'Bob topic' }),
      makeEvent({ eventId: '$new', sender: '@alice:example.org', ts: 20, topic: ' New topic ' }),
    ]);

    expect(topic).toBe('New topic');
  });

  it('ignores redacted, empty, wrong target, and wrong type topic events', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({ eventId: '$redacted', topic: 'Redacted', redacted: true, ts: 10 }),
      makeEvent({ eventId: '$empty', topic: '   ', ts: 20 }),
      makeEvent({
        eventId: '$wrong-target',
        topic: 'Wrong target',
        associatedId: '$other',
        ts: 30,
      }),
      makeEvent({
        eventId: '$wrong-type',
        type: MessageEvent.RoomMessage,
        topic: 'Wrong type',
        ts: 40,
      }),
    ]);

    expect(topic).toBeUndefined();
  });

  it('prefers the root sender topic over an agent topic', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({
        eventId: '$agent',
        sender: '@_agent_claude:example.org',
        ts: 30,
        topic: 'Agent topic',
      }),
      makeEvent({
        eventId: '$root-topic',
        sender: '@alice:example.org',
        ts: 10,
        topic: 'Root topic',
      }),
    ]);

    expect(topic).toBe('Root topic');
  });

  it('falls back to an agent topic when the root sender has none', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({ eventId: '$bob', sender: '@bob:example.org', ts: 30, topic: 'Bob topic' }),
      makeEvent({
        eventId: '$agent',
        sender: '@_agent_claude:example.org',
        ts: 20,
        topic: 'Agent topic',
      }),
    ]);

    expect(topic).toBe('Agent topic');
  });

  it('ignores topics from regular members (neither root sender nor agent)', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({ eventId: '$bob', sender: '@bob:example.org', ts: 30, topic: 'Bob topic' }),
      makeEvent({ eventId: '$carol', sender: '@carol:example.org', ts: 40, topic: 'Carol topic' }),
    ]);

    expect(topic).toBeUndefined();
  });

  it('picks the latest agent topic among multiple agents', () => {
    const rootEvent = makeEvent({ eventId: '$root', sender: '@alice:example.org' });
    const topic = getLatestThreadTopic(rootEvent, [
      makeEvent({
        eventId: '$agent-old',
        sender: '@_agent_eve:example.org',
        ts: 10,
        topic: 'Old agent topic',
      }),
      makeEvent({
        eventId: '$agent-new',
        sender: '@_agent_claude:example.org',
        ts: 20,
        topic: ' New agent topic ',
      }),
    ]);

    expect(topic).toBe('New agent topic');
  });
});
