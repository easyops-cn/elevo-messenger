import { Direction, EventTimeline } from 'matrix-js-sdk';
import type { MatrixEvent } from 'matrix-js-sdk';
import type { ItemRange } from '../../hooks/useVirtualPaginator';

type Timeline = {
  linkedTimelines: EventTimeline[];
  range: ItemRange;
};

export type TimelineLocalEchoRefreshInput = {
  timeline: Timeline;
  liveTimeline: EventTimeline;
  wasAtLiveEnd: boolean;
};

export type TimelineLocalEchoRefreshResult = {
  timeline: Timeline;
  scrollToBottom: boolean;
};

const getFirstLinkedTimeline = (timeline: EventTimeline, direction: Direction): EventTimeline => {
  const linkedTm = timeline.getNeighbouringTimeline(direction);
  if (!linkedTm) return timeline;
  return getFirstLinkedTimeline(linkedTm, direction);
};

const getLinkedTimelines = (timeline: EventTimeline): EventTimeline[] => {
  const firstTimeline = getFirstLinkedTimeline(timeline, Direction.Backward);
  const timelines: EventTimeline[] = [];

  for (
    let nextTimeline: EventTimeline | null = firstTimeline;
    nextTimeline;
    nextTimeline = nextTimeline.getNeighbouringTimeline(Direction.Forward)
  ) {
    timelines.push(nextTimeline);
  }
  return timelines;
};

const getTimelinesEventsCount = (timelines: EventTimeline[]): number =>
  timelines.reduce((count, tm) => count + tm.getEvents().length, 0);

export const eventBelongsToTimelineView = (
  mEvent: Pick<MatrixEvent, 'getId'> & { threadRootId?: string },
  threadId?: string,
): boolean => {
  if (threadId) {
    return mEvent.getId() === threadId || mEvent.threadRootId === threadId;
  }
  return !mEvent.threadRootId;
};

export const refreshTimelineForLocalEcho = ({
  timeline,
  liveTimeline,
  wasAtLiveEnd,
}: TimelineLocalEchoRefreshInput): TimelineLocalEchoRefreshResult => {
  const liveTimelineLinked =
    timeline.linkedTimelines[timeline.linkedTimelines.length - 1] === liveTimeline;

  if (!liveTimelineLinked) {
    return {
      timeline: { ...timeline },
      scrollToBottom: false,
    };
  }

  const linkedTimelines = getLinkedTimelines(liveTimeline);
  const eventsLength = getTimelinesEventsCount(linkedTimelines);
  const appendedCount = Math.max(eventsLength - timeline.range.end, 0);

  if (wasAtLiveEnd) {
    return {
      timeline: {
        linkedTimelines,
        range: {
          start: timeline.range.start + appendedCount,
          end: eventsLength,
        },
      },
      scrollToBottom: appendedCount > 0,
    };
  }

  return {
    timeline: {
      linkedTimelines,
      range: {
        start: timeline.range.start,
        end: Math.min(timeline.range.end, eventsLength),
      },
    },
    scrollToBottom: false,
  };
};
