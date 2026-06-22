import { describe, expect, it } from 'vitest';
import { Direction } from 'matrix-js-sdk';
import { eventBelongsToTimelineView, refreshTimelineForLocalEcho } from './timelineLocalEcho';

type FakeEvent = {
  id: string;
  threadRootId?: string;
  getId: () => string;
};

type FakeTimeline = {
  events: FakeEvent[];
  backward?: FakeTimeline | null;
  forward?: FakeTimeline | null;
  getEvents: () => FakeEvent[];
  getNeighbouringTimeline: (direction: Direction) => FakeTimeline | null;
};

const createEvent = (id: string, threadRootId?: string): FakeEvent => ({
  id,
  threadRootId,
  getId: () => id,
});

const createTimeline = (events: FakeEvent[]): FakeTimeline => ({
  events,
  getEvents() {
    return this.events;
  },
  getNeighbouringTimeline(direction: Direction) {
    return direction === Direction.Backward ? (this.backward ?? null) : (this.forward ?? null);
  },
});

describe('eventBelongsToTimelineView', () => {
  it('keeps thread events out of the main timeline', () => {
    expect(eventBelongsToTimelineView(createEvent('$1'), undefined)).toBe(true);
    expect(eventBelongsToTimelineView(createEvent('$2', '$thread'), undefined)).toBe(false);
  });

  it('keeps only the thread root and replies in a thread timeline', () => {
    expect(eventBelongsToTimelineView(createEvent('$thread'), '$thread')).toBe(true);
    expect(eventBelongsToTimelineView(createEvent('$reply', '$thread'), '$thread')).toBe(true);
    expect(eventBelongsToTimelineView(createEvent('$other'), '$thread')).toBe(false);
    expect(eventBelongsToTimelineView(createEvent('$reply', '$other-thread'), '$thread')).toBe(
      false,
    );
  });
});

describe('refreshTimelineForLocalEcho', () => {
  it('extends the visible range when an event is appended at the live end', () => {
    const liveTimeline = createTimeline([createEvent('$1'), createEvent('$2'), createEvent('$3')]);

    const refresh = refreshTimelineForLocalEcho({
      timeline: {
        linkedTimelines: [liveTimeline as never],
        range: { start: 0, end: 2 },
      },
      liveTimeline: liveTimeline as never,
      wasAtLiveEnd: true,
    });

    expect(refresh.timeline.range).toEqual({ start: 1, end: 3 });
    expect(refresh.scrollToBottom).toBe(true);
  });

  it('rerenders without extending the range when only status changes', () => {
    const liveTimeline = createTimeline([createEvent('$1'), createEvent('$2')]);

    const refresh = refreshTimelineForLocalEcho({
      timeline: {
        linkedTimelines: [liveTimeline as never],
        range: { start: 0, end: 2 },
      },
      liveTimeline: liveTimeline as never,
      wasAtLiveEnd: true,
    });

    expect(refresh.timeline.range).toEqual({ start: 0, end: 2 });
    expect(refresh.scrollToBottom).toBe(false);
  });

  it('updates linked timelines without stealing scroll when not at the live end', () => {
    const liveTimeline = createTimeline([createEvent('$1'), createEvent('$2'), createEvent('$3')]);

    const refresh = refreshTimelineForLocalEcho({
      timeline: {
        linkedTimelines: [liveTimeline as never],
        range: { start: 0, end: 1 },
      },
      liveTimeline: liveTimeline as never,
      wasAtLiveEnd: false,
    });

    expect(refresh.timeline.range).toEqual({ start: 0, end: 1 });
    expect(refresh.timeline.linkedTimelines).toEqual([liveTimeline]);
    expect(refresh.scrollToBottom).toBe(false);
  });
});
