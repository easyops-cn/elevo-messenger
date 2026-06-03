import React, {
  Dispatch,
  MouseEventHandler,
  // RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Direction,
  EventTimeline,
  EventTimelineSet,
  EventTimelineSetHandlerMap,
  IContent,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
  RoomEventHandlerMap,
  ThreadEvent,
  type Thread,
} from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import classNames from 'classnames';
import { ReactEditor } from 'slate-react';
import { Editor } from 'slate';
import { SessionMembershipData } from 'matrix-js-sdk/lib/matrixrtc';
import to from 'await-to-js';
import { useAtomValue, useSetAtom } from 'jotai';
import { Badge, Box, Chip, Icon, Icons, Scroll, Text, as, config, toRem } from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { useTranslation } from 'react-i18next';
import { eventWithShortcode, factoryEventSentBy, getMxIdLocalPart } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVirtualPaginator, ItemRange } from '../../hooks/useVirtualPaginator';
import { useAlive } from '../../hooks/useAlive';
import {
  Reply,
  MessageBase,
  MessageBrokenContent,
  MessageUnsupportedContent,
  Time,
  MessageNotDecryptedContent,
  RedactedContent,
  MSticker,
  ImageContent,
  EventContent,
  isUserAnswerEvent,
} from '../../components/message';
import { DiffSummaryCard } from '../../components/message/elevo/DiffSummaryCard';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { summarizeElevoDiffContent } from '../../components/message/elevo/diffSummary';
import {
  decryptAllTimelineEvent,
  getEditedEvent,
  getEventReactions,
  getMemberDisplayName,
  getReactionContent,
  isMembershipChanged,
  reactionOrEditEvent,
} from '../../utils/room';
import { useSetting } from '../../state/hooks/settings';
import { MessageLayout, settingsAtom } from '../../state/settings';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { Reactions, Message, Event, EncryptedContent } from './message';
import { useMemberEventParser } from '../../hooks/useMemberEventParser';
import { RoomIntro } from '../../components/room-intro';
// import {
//   getIntersectionObserverEntry,
//   useIntersectionObserver,
// } from '../../hooks/useIntersectionObserver';
import { markAsRead } from '../../utils/notifications';
// import { useDebounce } from '../../hooks/useDebounce';
// import { getResizeObserverEntry, useResizeObserver } from '../../hooks/useResizeObserver';
import * as css from './RoomTimeline.css';
import { inSameDay, secondDifference, timeDayMonthYear, today, yesterday } from '../../utils/time';
import { createMentionElement, moveCursor } from '../../components/editor';
import { threadOrRoomIdToReplyDraftAtomFamily } from '../../state/room/roomInputDrafts';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { GetContentCallback, MessageEvent, StateEvent } from '../../../types/matrix/room';
import { useDocumentFocusChange } from '../../hooks/useDocumentFocusChange';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { Image } from '../../components/media';
import { ImageViewer } from '../../components/image-viewer';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { useRoomUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { useImagePackRooms } from '../../hooks/useImagePackRooms';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useThreadChat } from '../../state/threadChat';
import { ThreadSummary } from './ThreadSummary';
import { useRoomScrollToBottom } from './RoomScrollToBottomContext';
import { useRoomThread } from './RoomThreadContext';
import { useAutoScroll } from '../../hooks/useAutoScroll';

const TimelineFloat = as<'div', css.TimelineFloatVariants>(
  ({ position, className, ...props }, ref) => (
    <Box
      className={classNames(css.TimelineFloat({ position }), className)}
      justifyContent="Center"
      alignItems="Center"
      gap="200"
      {...props}
      ref={ref}
    />
  ),
);

const TimelineDivider = as<'div'>(({ children, ...props }, ref) => (
  <Box gap="100" justifyContent="Center" alignItems="Center" {...props} ref={ref}>
    {children}
  </Box>
));

const getTimelineSet = (room: Room, thread: Thread | undefined): EventTimelineSet =>
  thread ? thread.timelineSet : room.getUnfilteredTimelineSet();

const getLiveTimeline = (room: Room, thread: Thread | undefined): EventTimeline => {
  if (thread) {
    return thread.liveTimeline;
  }
  return room.getLiveTimeline();
};

const getEventTimeline = (
  room: Room,
  eventId: string,
  thread: Thread | undefined,
): EventTimeline | undefined => {
  const timelineSet = getTimelineSet(room, thread);
  return timelineSet.getTimelineForEvent(eventId) ?? undefined;
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

const timelineToEventsCount = (t: EventTimeline) => t.getEvents().length;
const getTimelinesEventsCount = (timelines: EventTimeline[]): number => {
  const timelineEventCountReducer = (count: number, tm: EventTimeline) =>
    count + timelineToEventsCount(tm);
  return timelines.reduce(timelineEventCountReducer, 0);
};

const timelineIncludesEvent = (timelines: EventTimeline[], eventId: string): boolean =>
  timelines.some((timeline) => timeline.getEvents().some((evt) => evt.getId() === eventId));

const findCurrentFirstEventTimeline = (
  timelineSet: EventTimelineSet,
  timelines: EventTimeline[],
) => {
  const firstEventId = timelines[0]?.getEvents()[0]?.getId();
  return firstEventId ? timelineSet.getTimelineForEvent(firstEventId) : undefined;
};

const getTimelineAndBaseIndex = (
  timelines: EventTimeline[],
  index: number,
): [EventTimeline | undefined, number] => {
  let uptoTimelineLen = 0;
  const timeline = timelines.find((t) => {
    uptoTimelineLen += t.getEvents().length;
    if (index < uptoTimelineLen) return true;
    return false;
  });
  if (!timeline) return [undefined, 0];
  return [timeline, uptoTimelineLen - timeline.getEvents().length];
};

const getTimelineRelativeIndex = (absoluteIndex: number, timelineBaseIndex: number) =>
  absoluteIndex - timelineBaseIndex;

const getTimelineEvent = (timeline: EventTimeline, index: number): MatrixEvent | undefined =>
  timeline.getEvents()[index];

const getEventIdAbsoluteIndex = (
  timelines: EventTimeline[],
  eventTimeline: EventTimeline,
  eventId: string,
): number | undefined => {
  const timelineIndex = timelines.findIndex((t) => t === eventTimeline);
  if (timelineIndex === -1) return undefined;
  const eventIndex = eventTimeline.getEvents().findIndex((evt) => evt.getId() === eventId);
  if (eventIndex === -1) return undefined;
  const baseIndex = timelines
    .slice(0, timelineIndex)
    .reduce((accValue, timeline) => timeline.getEvents().length + accValue, 0);
  return baseIndex + eventIndex;
};

type RoomTimelineProps = {
  room: Room;
  eventId?: string;
  editor: Editor;
};

const PAGINATION_LIMIT = 80;
const PAGINATION_ROOT_MARGIN = '640px 0px';
const PAGINATION_SENTINEL_STYLE = {
  height: 1,
  minHeight: 1,
  overflow: 'hidden',
  pointerEvents: 'none',
} as const;

type Timeline = {
  linkedTimelines: EventTimeline[];
  range: ItemRange;
};

const useEventTimelineLoader = (
  mx: MatrixClient,
  timelineSet: EventTimelineSet,
  onLoad: (eventId: string, linkedTimelines: EventTimeline[], evtAbsIndex: number) => void,
  onError: (err: Error | null) => void,
) => {
  const loadEventTimeline = useCallback(
    async (eventId: string) => {
      const [err, replyEvtTimeline] = await to(mx.getEventTimeline(timelineSet, eventId));
      if (!replyEvtTimeline) {
        onError(err ?? null);
        return;
      }
      const linkedTimelines = getLinkedTimelines(replyEvtTimeline);
      const absIndex = getEventIdAbsoluteIndex(linkedTimelines, replyEvtTimeline, eventId);

      if (absIndex === undefined) {
        onError(err ?? null);
        return;
      }

      onLoad(eventId, linkedTimelines, absIndex);
    },
    [mx, timelineSet, onLoad, onError],
  );

  return loadEventTimeline;
};

const useTimelinePagination = (
  mx: MatrixClient,
  timeline: Timeline,
  setTimeline: Dispatch<SetStateAction<Timeline>>,
  limit: number,
) => {
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;
  const alive = useAlive();

  const handleTimelinePagination = useMemo(() => {
    let fetching = false;

    const recalibratePagination = (
      linkedTimelines: EventTimeline[],
      timelinesEventsCount: number[],
      backwards: boolean,
    ) => {
      const topTimeline = linkedTimelines[0];
      const timelineMatch = (mt: EventTimeline) => (t: EventTimeline) => t === mt;

      const newLTimelines = getLinkedTimelines(topTimeline);
      const topTmIndex = newLTimelines.findIndex(timelineMatch(topTimeline));
      const topAddedTm = topTmIndex === -1 ? [] : newLTimelines.slice(0, topTmIndex);

      const topTmAddedEvt =
        topTmIndex === -1
          ? 0
          : timelineToEventsCount(newLTimelines[topTmIndex]) - timelinesEventsCount[0];
      const offsetRange = getTimelinesEventsCount(topAddedTm) + (backwards ? topTmAddedEvt : 0);

      setTimeline((currentTimeline) => ({
        linkedTimelines: newLTimelines,
        range:
          offsetRange > 0
            ? {
                start: currentTimeline.range.start + offsetRange,
                end: currentTimeline.range.end + offsetRange,
              }
            : { ...currentTimeline.range },
      }));
    };

    return async (backwards: boolean) => {
      if (fetching) return;
      const { linkedTimelines: lTimelines } = timelineRef.current;
      const timelinesEventsCount = lTimelines.map(timelineToEventsCount);

      const timelineToPaginate = backwards ? lTimelines[0] : lTimelines[lTimelines.length - 1];
      if (!timelineToPaginate) return;

      const paginationToken = timelineToPaginate.getPaginationToken(
        backwards ? Direction.Backward : Direction.Forward,
      );
      if (
        !paginationToken &&
        getTimelinesEventsCount(lTimelines) !==
          getTimelinesEventsCount(getLinkedTimelines(timelineToPaginate))
      ) {
        recalibratePagination(lTimelines, timelinesEventsCount, backwards);
        return;
      }

      fetching = true;
      const [err] = await to(
        mx.paginateEventTimeline(timelineToPaginate, {
          backwards,
          limit,
        }),
      );
      if (err) {
        // TODO: handle pagination error.
        return;
      }
      const fetchedTimeline =
        timelineToPaginate.getNeighbouringTimeline(
          backwards ? Direction.Backward : Direction.Forward,
        ) ?? timelineToPaginate;
      // Decrypt all event ahead of render cycle
      const roomId = fetchedTimeline.getRoomId();
      const room = roomId ? mx.getRoom(roomId) : null;

      if (room?.hasEncryptionStateEvent()) {
        await to(decryptAllTimelineEvent(mx, fetchedTimeline));
      }

      fetching = false;
      if (alive()) {
        const firstEventTimeline =
          !backwards &&
          findCurrentFirstEventTimeline(timelineToPaginate.getTimelineSet(), lTimelines);
        const firstEventTimelineChanged =
          firstEventTimeline && firstEventTimeline !== lTimelines[0];
        if (firstEventTimelineChanged) {
          console.warn(
            'First event timeline changed when paginating from:',
            lTimelines[0],
            'to:',
            firstEventTimeline,
          );
        }
        recalibratePagination(
          firstEventTimelineChanged ? [firstEventTimeline, ...lTimelines.slice(1)] : lTimelines,
          timelinesEventsCount,
          backwards,
        );
      }
    };
  }, [mx, alive, setTimeline, limit]);
  return handleTimelinePagination;
};

const useLiveEventArrive = (
  room: Room,
  thread: Thread | undefined,
  onArrive: (mEvent: MatrixEvent) => void,
) => {
  useEffect(() => {
    const handleTimelineEvent: EventTimelineSetHandlerMap[RoomEvent.Timeline] = (
      mEvent,
      eventRoom,
      toStartOfTimeline,
      removed,
      data,
    ) => {
      if (eventRoom?.roomId !== room.roomId || !data.liveEvent) return;
      if (
        thread
          ? mEvent.getId() !== thread.id && mEvent.threadRootId !== thread.id
          : !!mEvent.threadRootId
      ) {
        return;
      }
      onArrive(mEvent);
    };
    const handleRedaction: RoomEventHandlerMap[RoomEvent.Redaction] = (mEvent, eventRoom) => {
      if (eventRoom?.roomId !== room.roomId) return;
      if (
        thread
          ? mEvent.getId() !== thread.id && mEvent.threadRootId !== thread.id
          : !!mEvent.threadRootId
      ) {
        return;
      }
      onArrive(mEvent);
    };

    room.on(RoomEvent.Timeline, handleTimelineEvent);
    room.on(RoomEvent.Redaction, handleRedaction);
    return () => {
      room.removeListener(RoomEvent.Timeline, handleTimelineEvent);
      room.removeListener(RoomEvent.Redaction, handleRedaction);
    };
  }, [room, onArrive, thread]);
};

const useLiveTimelineRefresh = (room: Room, onRefresh: () => void) => {
  useEffect(() => {
    const handleTimelineRefresh: RoomEventHandlerMap[RoomEvent.TimelineRefresh] = (r) => {
      if (r.roomId !== room.roomId) return;
      onRefresh();
    };

    room.on(RoomEvent.TimelineRefresh, handleTimelineRefresh);
    return () => {
      room.removeListener(RoomEvent.TimelineRefresh, handleTimelineRefresh);
    };
  }, [room, onRefresh]);
};

const useThreadRootUpdate = (
  room: Room,
  thread: Thread | undefined,
  onUpdate: (updatedThread: Thread) => void,
) => {
  useEffect(() => {
    if (thread) return undefined;

    const handleThreadUpdate = (updatedThread: Thread) => {
      if (updatedThread.room.roomId !== room.roomId) return;
      onUpdate(updatedThread);
    };

    room.on(ThreadEvent.New, handleThreadUpdate);
    room.on(ThreadEvent.Update, handleThreadUpdate);
    room.on(ThreadEvent.NewReply, handleThreadUpdate);
    room.on(ThreadEvent.Delete, handleThreadUpdate);
    return () => {
      room.removeListener(ThreadEvent.New, handleThreadUpdate);
      room.removeListener(ThreadEvent.Update, handleThreadUpdate);
      room.removeListener(ThreadEvent.NewReply, handleThreadUpdate);
      room.removeListener(ThreadEvent.Delete, handleThreadUpdate);
    };
  }, [room, thread, onUpdate]);
};

const getInitialTimeline = (room: Room, thread: Thread | undefined) => {
  const linkedTimelines = getLinkedTimelines(getLiveTimeline(room, thread));
  const evLength = getTimelinesEventsCount(linkedTimelines);
  return {
    linkedTimelines,
    range: {
      start: Math.max(evLength - PAGINATION_LIMIT, 0),
      end: evLength,
    },
  };
};

const getEmptyTimeline = () => ({
  range: { start: 0, end: 0 },
  linkedTimelines: [],
});

const getRoomUnreadInfo = (room: Room, scrollTo: boolean, thread: Thread | undefined) => {
  const receiptStore = thread ?? room;
  const readUptoEventId = receiptStore.getEventReadUpTo(room.client.getSafeUserId());
  if (!readUptoEventId) return undefined;
  const evtTimeline = getEventTimeline(room, readUptoEventId, thread);
  const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
  return {
    readUptoEventId,
    inLiveTimeline: latestTimeline === getLiveTimeline(room, thread),
    scrollTo,
  };
};

export function RoomTimeline({ room, eventId, editor }: RoomTimelineProps) {
  const thread = useRoomThread();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const [messageLayout] = useSetting(settingsAtom, 'messageLayout');
  const [messageSpacing] = useSetting(settingsAtom, 'messageSpacing');
  const [hideMembershipEvents] = useSetting(settingsAtom, 'hideMembershipEvents');
  const [hideNickAvatarEvents] = useSetting(settingsAtom, 'hideNickAvatarEvents');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');
  const [encUrlPreview] = useSetting(settingsAtom, 'encUrlPreview');
  const showUrlPreview = room.hasEncryptionStateEvent() ? encUrlPreview : urlPreview;
  const [showHiddenEvents] = useSetting(settingsAtom, 'showHiddenEvents');
  const [showDeveloperTools] = useSetting(settingsAtom, 'developerTools');
  const { listenScrollToBottomRequest } = useRoomScrollToBottom();

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const ignoredUsersList = useIgnoredUsers();
  const ignoredUsersSet = useMemo(() => new Set(ignoredUsersList), [ignoredUsersList]);
  const activeTimelineSet = useMemo(() => getTimelineSet(room, thread), [room, thread]);

  const threadOrRoomId = thread?.id || room.roomId;
  const setReplyDraft = useSetAtom(threadOrRoomIdToReplyDraftAtomFamily(threadOrRoomId));
  const [, setThreadChat] = useThreadChat(room.roomId);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);

  const canRedact = permissions.action('redact', mx.getSafeUserId());
  const canDeleteOwn = permissions.event(MessageEvent.RoomRedaction, mx.getSafeUserId());
  const canSendReaction = permissions.event(MessageEvent.Reaction, mx.getSafeUserId());
  const canPinEvent = permissions.stateEvent(StateEvent.RoomPinnedEvents, mx.getSafeUserId());
  const [editId, setEditId] = useState<string>();

  const roomToParents = useAtomValue(roomToParentsAtom);
  const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const { navigateRoom } = useRoomNavigate();
  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const spoilerClickHandler = useSpoilerClickHandler();
  const openUserRoomProfile = useOpenUserRoomProfile();
  const space = useSpaceOptionally();

  const imagePackRooms: Room[] = useImagePackRooms(room.roomId, roomToParents);

  const [unreadInfo, setUnreadInfo] = useState(() => getRoomUnreadInfo(room, true, thread));
  const readUptoEventIdRef = useRef<string>();
  if (unreadInfo) {
    readUptoEventIdRef.current = unreadInfo.readUptoEventId;
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const scrollToBottomRef = useRef({
    count: 0,
    smooth: true,
  });

  const { scrollable, scrollToBottom, toggleAutoScroll } = useAutoScroll(
    scrollRef,
    scrollContentRef,
  );
  const atBottomRef = useRef(!scrollable);
  atBottomRef.current = !scrollable;

  useEffect(() => {
    const unsubscribe = listenScrollToBottomRequest(() => {
      scrollToBottom();

      scrollToBottomRef.current.count += 1;
      scrollToBottomRef.current.smooth = false;
    });

    return unsubscribe;
  }, [listenScrollToBottomRequest, scrollToBottom]);

  const [focusItem, setFocusItem] = useState<
    | {
        eventId: string;
        scrollTo: boolean;
        highlight: boolean;
      }
    | undefined
  >();
  const alive = useAlive();

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(mx, room.roomId, href, makeMentionCustomProps(mentionClickHandler)),
      ),
    }),
    [mx, room, mentionClickHandler],
  );
  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
      }),
    [mx, room, linkifyOpts, spoilerClickHandler, mentionClickHandler, useAuthentication],
  );
  const parseMemberEvent = useMemberEventParser(room);

  const [timeline, setTimeline] = useState<Timeline>(() =>
    eventId ? getEmptyTimeline() : getInitialTimeline(room, thread),
  );
  const eventsLength = getTimelinesEventsCount(timeline.linkedTimelines);
  const liveTimelineLinked =
    timeline.linkedTimelines[timeline.linkedTimelines.length - 1] === getLiveTimeline(room, thread);
  const canPaginateBack =
    typeof timeline.linkedTimelines[0]?.getPaginationToken(Direction.Backward) === 'string';
  const rangeAtStart = timeline.range.start === 0;
  const rangeAtEnd = timeline.range.end === eventsLength;
  const atLiveEndRef = useRef(liveTimelineLinked && rangeAtEnd);
  atLiveEndRef.current = liveTimelineLinked && rangeAtEnd;

  const handleTimelinePagination = useTimelinePagination(
    mx,
    timeline,
    setTimeline,
    PAGINATION_LIMIT,
  );

  const getScrollElement = useCallback(() => scrollRef.current, []);

  const { getItems, scrollToItem, scrollToElement, observeBackAnchor, observeFrontAnchor } =
    useVirtualPaginator({
      count: eventsLength,
      limit: PAGINATION_LIMIT,
      range: timeline.range,
      onRangeChange: useCallback((r) => setTimeline((cs) => ({ ...cs, range: r })), []),
      rootMargin: PAGINATION_ROOT_MARGIN,
      getScrollElement,
      getItemElement: useCallback(
        (index: number) =>
          (scrollRef.current?.querySelector(`[data-message-item="${index}"]`) as HTMLElement) ??
          undefined,
        [],
      ),
      getItemKey: useCallback(
        (index: number) => {
          const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(
            timeline.linkedTimelines,
            index,
          );
          return eventTimeline
            ? getTimelineEvent(eventTimeline, getTimelineRelativeIndex(index, baseIndex))?.getId()
            : undefined;
        },
        [timeline.linkedTimelines],
      ),
      getItemElementByKey: useCallback(
        (evtId: string) =>
          (scrollRef.current?.querySelector(`[data-message-id="${evtId}"]`) as HTMLElement) ??
          undefined,
        [],
      ),
      onEnd: handleTimelinePagination,
    });

  const loadEventTimeline = useEventTimelineLoader(
    mx,
    activeTimelineSet,
    useCallback(
      (evtId, lTimelines, evtAbsIndex) => {
        if (!alive()) return;
        const evLength = getTimelinesEventsCount(lTimelines);

        setFocusItem({
          eventId: evtId,
          scrollTo: true,
          highlight: evtId === eventId || evtId !== readUptoEventIdRef.current,
        });
        setTimeline({
          linkedTimelines: lTimelines,
          range: {
            start: Math.max(evtAbsIndex - PAGINATION_LIMIT, 0),
            end: Math.min(evtAbsIndex + PAGINATION_LIMIT, evLength),
          },
        });
      },
      [alive, eventId],
    ),
    useCallback(() => {
      if (!alive()) return;
      setTimeline(getInitialTimeline(room, thread));
      scrollToBottomRef.current.count += 1;
      scrollToBottomRef.current.smooth = false;
    }, [alive, room, thread]),
  );

  useLiveEventArrive(
    room,
    thread,
    useCallback(
      (mEvt: MatrixEvent) => {
        // if user is at bottom of timeline
        // keep paginating timeline and conditionally mark as read
        // otherwise we update timeline without paginating
        // so timeline can be updated with evt like: edits, reactions etc
        if (atBottomRef.current) {
          if (document.hasFocus() && (!unreadInfo || mEvt.getSender() === mx.getUserId())) {
            // Check if the document is in focus (user is actively viewing the app),
            // and either there are no unread messages or the latest message is from the current user.
            // If either condition is met, trigger the markAsRead function to send a read receipt.
            requestAnimationFrame(() =>
              markAsRead(mx, mEvt.getRoomId()!, hideActivity, thread?.id),
            );
          }

          if (!document.hasFocus() && !unreadInfo) {
            setUnreadInfo(getRoomUnreadInfo(room, false, thread));
          }

          scrollToBottomRef.current.count += 1;
          scrollToBottomRef.current.smooth = true;

          setTimeline((ct) => ({
            ...ct,
            range: {
              start: ct.range.start + 1,
              end: ct.range.end + 1,
            },
          }));
          return;
        }
        setTimeline((ct) => ({ ...ct }));
        if (!unreadInfo) {
          setUnreadInfo(getRoomUnreadInfo(room, false, thread));
        }
      },
      [mx, room, thread, unreadInfo, hideActivity],
    ),
  );

  const handleOpenEvent = useCallback(
    async (
      evtId: string,
      highlight = true,
      onScroll: ((scrolled: boolean) => void) | undefined = undefined,
    ) => {
      const evtTimeline = getEventTimeline(room, evtId, thread);
      const absoluteIndex =
        evtTimeline && getEventIdAbsoluteIndex(timeline.linkedTimelines, evtTimeline, evtId);

      if (typeof absoluteIndex === 'number') {
        if (absoluteIndex < timeline.range.start || absoluteIndex >= timeline.range.end) {
          setTimeline((currentTimeline) => ({
            ...currentTimeline,
            range: {
              start: Math.max(absoluteIndex - PAGINATION_LIMIT, 0),
              end: Math.min(
                absoluteIndex + PAGINATION_LIMIT,
                getTimelinesEventsCount(currentTimeline.linkedTimelines),
              ),
            },
          }));
          if (onScroll) onScroll(true);
          setFocusItem({
            eventId: evtId,
            scrollTo: true,
            highlight,
          });
          return;
        }

        const eventElement =
          (scrollRef.current?.querySelector(`[data-message-id="${evtId}"]`) as HTMLElement) ??
          undefined;
        const scrolled =
          eventElement !== undefined
            ? (toggleAutoScroll(false),
              scrollToElement(eventElement, {
                behavior: 'smooth',
                align: 'center',
                stopInView: true,
              }))
            : false;
        if (onScroll) onScroll(scrolled);
        setFocusItem({
          eventId: evtId,
          scrollTo: false,
          highlight,
        });
      } else {
        setTimeline(getEmptyTimeline());
        loadEventTimeline(evtId);
      }
    },
    [room, thread, timeline, scrollToElement, loadEventTimeline, toggleAutoScroll],
  );

  useLiveTimelineRefresh(
    room,
    useCallback(() => {
      if (liveTimelineLinked) {
        setTimeline(getInitialTimeline(room, thread));
      }
    }, [room, thread, liveTimelineLinked]),
  );

  useThreadRootUpdate(
    room,
    thread,
    useCallback(
      (updatedThread) => {
        if (timelineIncludesEvent(timeline.linkedTimelines, updatedThread.id)) {
          setTimeline((currentTimeline) => ({ ...currentTimeline }));
        }
      },
      [timeline.linkedTimelines],
    ),
  );

  const tryAutoMarkAsRead = useCallback(() => {
    const readUptoEventId = readUptoEventIdRef.current;
    if (!readUptoEventId) {
      requestAnimationFrame(() => markAsRead(mx, room.roomId, hideActivity, thread?.id));
      return;
    }
    const evtTimeline = getEventTimeline(room, readUptoEventId, thread);
    const latestTimeline = evtTimeline && getFirstLinkedTimeline(evtTimeline, Direction.Forward);
    if (latestTimeline === getLiveTimeline(room, thread)) {
      requestAnimationFrame(() => markAsRead(mx, room.roomId, hideActivity, thread?.id));
    }
  }, [mx, room, thread, hideActivity]);

  useEffect(() => {
    if (!scrollable && document.hasFocus()) {
      tryAutoMarkAsRead();
    }
  }, [scrollable, tryAutoMarkAsRead]);

  useDocumentFocusChange(
    useCallback(
      (inFocus) => {
        if (inFocus && atBottomRef.current) {
          tryAutoMarkAsRead();
        }
      },
      [tryAutoMarkAsRead],
    ),
  );

  useEffect(() => {
    if (eventId) {
      setTimeline(getEmptyTimeline());
      loadEventTimeline(eventId);
    }
  }, [eventId, loadEventTimeline]);

  // Scroll to bottom on initial timeline load
  useLayoutEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // if live timeline is linked and unreadInfo change
  // Scroll to last read message
  useLayoutEffect(() => {
    const { readUptoEventId, inLiveTimeline, scrollTo } = unreadInfo ?? {};
    if (readUptoEventId && inLiveTimeline && scrollTo) {
      const linkedTimelines = getLinkedTimelines(getLiveTimeline(room, thread));
      const evtTimeline = getEventTimeline(room, readUptoEventId, thread);
      const absoluteIndex =
        evtTimeline && getEventIdAbsoluteIndex(linkedTimelines, evtTimeline, readUptoEventId);
      if (
        absoluteIndex !== undefined &&
        absoluteIndex < getTimelinesEventsCount(linkedTimelines) - 1
      ) {
        scrollToItem(absoluteIndex, {
          behavior: 'instant',
          align: 'start',
          stopInView: true,
        });
      }
    }
  }, [room, thread, unreadInfo, scrollToItem]);

  // scroll to focused message
  useLayoutEffect(() => {
    if (focusItem && focusItem.scrollTo) {
      const focusElement =
        (scrollRef.current?.querySelector(
          `[data-message-id="${focusItem.eventId}"]`,
        ) as HTMLElement) ?? undefined;
      if (focusElement) {
        toggleAutoScroll(false, 2000);
        scrollToElement(focusElement, {
          behavior: 'instant',
          align: 'center',
          stopInView: true,
        });
      }
    }

    setTimeout(() => {
      if (!alive()) return;
      setFocusItem((currentItem) => {
        if (currentItem === focusItem) return undefined;
        return currentItem;
      });
    }, 2000);
  }, [alive, focusItem, scrollToElement, toggleAutoScroll]);

  // scroll to bottom of timeline
  const scrollToBottomCount = scrollToBottomRef.current.count;
  useLayoutEffect(() => {
    if (scrollToBottomCount > 0) {
      scrollToBottom();
    }
  }, [scrollToBottom, scrollToBottomCount]);

  // Remove unreadInfo on mark as read
  useEffect(() => {
    if (!unread) {
      setUnreadInfo(undefined);
    }
  }, [unread]);

  // scroll out of view msg editor in view.
  useEffect(() => {
    if (editId) {
      const editMsgElement =
        (scrollRef.current?.querySelector(`[data-message-id="${editId}"]`) as HTMLElement) ??
        undefined;
      if (editMsgElement) {
        toggleAutoScroll(false);
        scrollToElement(editMsgElement, {
          align: 'center',
          behavior: 'smooth',
          stopInView: true,
        });
      }
    }
  }, [scrollToElement, editId, toggleAutoScroll]);

  useEffect(() => {
    if (eventId) {
      // Reset highlight eventId once highlighted.
      navigateRoom(room.roomId, undefined, { replace: true });
    }
  }, [eventId, navigateRoom, room]);

  const handleJumpToLatest = () => {
    setTimeline(getInitialTimeline(room, thread));
    toggleAutoScroll(true);
    scrollToBottom();
  };

  const handleJumpToUnread = () => {
    if (unreadInfo?.readUptoEventId) {
      setTimeline(getEmptyTimeline());
      loadEventTimeline(unreadInfo.readUptoEventId);
    }
  };

  const handleMarkAsRead = () => {
    markAsRead(mx, room.roomId, hideActivity, thread?.id);
  };

  const handleOpenReply: MouseEventHandler = useCallback(
    async (evt) => {
      const targetId = evt.currentTarget.getAttribute('data-event-id');
      if (!targetId) return;
      handleOpenEvent(targetId);
    },
    [handleOpenEvent],
  );

  const handleUserClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      openUserRoomProfile(
        room.roomId,
        space?.roomId,
        userId,
        evt.currentTarget.getBoundingClientRect(),
      );
    },
    [room, space, openUserRoomProfile],
  );
  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      evt.preventDefault();
      const userId = evt.currentTarget.getAttribute('data-user-id');
      if (!userId) {
        console.warn('Button should have "data-user-id" attribute!');
        return;
      }
      const name = getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;
      editor.insertNode(
        createMentionElement(
          userId,
          name.startsWith('@') ? name : `@${name}`,
          userId === mx.getUserId(),
        ),
      );
      ReactEditor.focus(editor);
      moveCursor(editor);
    },
    [mx, room, editor],
  );

  const handleReplyClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt, startThread = false) => {
      const replyId = evt.currentTarget.getAttribute('data-event-id');
      if (!replyId) {
        console.warn('Button should have "data-event-id" attribute!');
        return;
      }
      const replyEvt = room.findEventById(replyId);
      if (!replyEvt) return;
      const editedReply = getEditedEvent(replyId, replyEvt, activeTimelineSet);
      const content: IContent = editedReply?.getContent()['m.new_content'] ?? replyEvt.getContent();
      const { body, formatted_body: formattedBody } = content;
      const { 'm.relates_to': relation } =
        startThread || thread
          ? { 'm.relates_to': { rel_type: 'm.thread', event_id: thread?.id ?? replyId } }
          : replyEvt.getWireContent();
      const senderId = replyEvt.getSender();
      if (senderId && typeof body === 'string') {
        setReplyDraft({
          userId: senderId,
          eventId: replyId,
          body,
          formattedBody,
          relation,
        });
        setTimeout(() => ReactEditor.focus(editor), 100);
      }
    },
    [room, thread, activeTimelineSet, setReplyDraft, editor],
  );

  const handleOpenThread: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const rootId = evt.currentTarget.getAttribute('data-event-id');
      if (!rootId) return;
      setThreadChat({ open: true, threadRootId: rootId });
    },
    [setThreadChat],
  );

  const handleReactionToggle = useCallback(
    (targetEventId: string, key: string, shortcode?: string) => {
      const relations = getEventReactions(activeTimelineSet, targetEventId);
      const allReactions = relations?.getSortedAnnotationsByKey() ?? [];
      const [, reactionsSet] = allReactions.find(([k]) => k === key) ?? [];
      const reactions = reactionsSet ? Array.from(reactionsSet) : [];
      const myReaction = reactions.find(factoryEventSentBy(mx.getUserId()!));

      if (myReaction && !!myReaction?.isRelation()) {
        mx.redactEvent(room.roomId, myReaction.getId()!);
        return;
      }
      const rShortcode =
        shortcode ||
        (reactions.find(eventWithShortcode)?.getContent().shortcode as string | undefined);
      mx.sendEvent(
        room.roomId,
        MessageEvent.Reaction as any,
        getReactionContent(targetEventId, key, rShortcode),
      );
    },
    [mx, room, activeTimelineSet],
  );
  const handleEdit = useCallback(
    (editEvtId?: string) => {
      if (editEvtId) {
        setEditId(editEvtId);
        return;
      }
      setEditId(undefined);
      ReactEditor.focus(editor);
    },
    [editor],
  );
  const { t } = useTranslation();
  const renderMatrixEvent = useMatrixEventRenderer<
    [string, MatrixEvent, number, EventTimelineSet, boolean]
  >(
    {
      [MessageEvent.RoomMessage]: (mEventId, mEvent, item, timelineSet, collapse) => {
        const reactionRelations = getEventReactions(timelineSet, mEventId);
        const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
        const hasReactions = reactions && reactions.length > 0;
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;

        const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
        const getContent = (() =>
          editedEvent?.getContent()['m.new_content'] ?? mEvent.getContent()) as GetContentCallback;

        const senderId = mEvent.getSender() ?? '';
        const senderDisplayName =
          getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;

        const { replyEventId, isThreadRoot } = mEvent;
        const replyToThread = mEvent.getThread();
        const showThreadSummary = !thread && isThreadRoot && !!replyToThread;

        return (
          <Message
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            messageSpacing={messageSpacing}
            messageLayout={messageLayout}
            collapse={collapse}
            highlight={highlighted}
            edit={editId === mEventId}
            canDelete={canRedact || (canDeleteOwn && mEvent.getSender() === mx.getUserId())}
            canSendReaction={canSendReaction}
            canPinEvent={canPinEvent}
            imagePackRooms={imagePackRooms}
            relations={hasReactions ? reactionRelations : undefined}
            onUserClick={handleUserClick}
            onUsernameClick={handleUsernameClick}
            onReplyClick={handleReplyClick}
            onReactionToggle={handleReactionToggle}
            onEditId={handleEdit}
            reply={
              replyEventId && (
                <Reply
                  room={room}
                  timelineSet={timelineSet}
                  eventId={mEventId}
                  replyEventId={replyEventId}
                  onClick={handleOpenReply}
                />
              )
            }
            reactions={
              reactionRelations && (
                <Reactions
                  style={{ marginTop: config.space.S200 }}
                  room={room}
                  relations={reactionRelations}
                  mEventId={mEventId}
                  canSendReaction={canSendReaction}
                  onReactionToggle={handleReactionToggle}
                />
              )
            }
            threadSummary={
              showThreadSummary && (
                <ThreadSummary
                  mEvent={mEvent}
                  room={room}
                  thread={replyToThread}
                  onOpenThread={handleOpenThread}
                />
              )
            }
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          >
            {mEvent.isRedacted() ? (
              <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
            ) : (
              <RenderMessageContent
                displayName={senderDisplayName}
                msgType={mEvent.getContent().msgtype ?? ''}
                ts={mEvent.getTs()}
                eventId={mEventId}
                senderId={senderId}
                edited={!!editedEvent}
                getContent={getContent}
                urlPreview={showUrlPreview}
                htmlReactParserOptions={htmlReactParserOptions}
                linkifyOpts={linkifyOpts}
                outlineAttachment={messageLayout === MessageLayout.Bubble}
              />
            )}
          </Message>
        );
      },
      [MessageEvent.RoomMessageEncrypted]: (mEventId, mEvent, item, timelineSet, collapse) => {
        const reactionRelations = getEventReactions(timelineSet, mEventId);
        const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
        const hasReactions = reactions && reactions.length > 0;
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;

        const { replyEventId, isThreadRoot } = mEvent;
        const replyToThread = mEvent.getThread();
        const showThreadSummary = !thread && isThreadRoot && !!replyToThread;

        return (
          <Message
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            messageSpacing={messageSpacing}
            messageLayout={messageLayout}
            collapse={collapse}
            highlight={highlighted}
            edit={editId === mEventId}
            canDelete={canRedact || (canDeleteOwn && mEvent.getSender() === mx.getUserId())}
            canSendReaction={canSendReaction}
            canPinEvent={canPinEvent}
            imagePackRooms={imagePackRooms}
            relations={hasReactions ? reactionRelations : undefined}
            onUserClick={handleUserClick}
            onUsernameClick={handleUsernameClick}
            onReplyClick={handleReplyClick}
            onReactionToggle={handleReactionToggle}
            onEditId={handleEdit}
            reply={
              replyEventId && (
                <Reply
                  room={room}
                  timelineSet={timelineSet}
                  eventId={mEventId}
                  replyEventId={replyEventId}
                  onClick={handleOpenReply}
                />
              )
            }
            reactions={
              reactionRelations && (
                <Reactions
                  style={{ marginTop: config.space.S200 }}
                  room={room}
                  relations={reactionRelations}
                  mEventId={mEventId}
                  canSendReaction={canSendReaction}
                  onReactionToggle={handleReactionToggle}
                />
              )
            }
            threadSummary={
              showThreadSummary && (
                <ThreadSummary
                  mEvent={mEvent}
                  room={room}
                  thread={replyToThread}
                  onOpenThread={handleOpenThread}
                />
              )
            }
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          >
            <EncryptedContent mEvent={mEvent}>
              {() => {
                if (mEvent.isRedacted()) return <RedactedContent />;
                if (mEvent.getType() === MessageEvent.Sticker)
                  return (
                    <MSticker
                      content={mEvent.getContent()}
                      createdAt={mEvent.getTs()}
                      renderImageContent={(props) => (
                        <ImageContent
                          {...props}
                          renderImage={(p) => <Image {...p} loading="lazy" />}
                          renderViewer={(p) => <ImageViewer {...p} />}
                        />
                      )}
                    />
                  );
                if (mEvent.getType() === MessageEvent.RoomMessage) {
                  const editedEvent = getEditedEvent(mEventId, mEvent, timelineSet);
                  const getContent = (() =>
                    editedEvent?.getContent()['m.new_content'] ??
                    mEvent.getContent()) as GetContentCallback;

                  const senderId = mEvent.getSender() ?? '';
                  const senderDisplayName =
                    getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId;
                  return (
                    <RenderMessageContent
                      displayName={senderDisplayName}
                      msgType={mEvent.getContent().msgtype ?? ''}
                      ts={mEvent.getTs()}
                      eventId={mEventId}
                      senderId={senderId}
                      edited={!!editedEvent}
                      getContent={getContent}
                      urlPreview={showUrlPreview}
                      htmlReactParserOptions={htmlReactParserOptions}
                      linkifyOpts={linkifyOpts}
                      outlineAttachment={messageLayout === MessageLayout.Bubble}
                    />
                  );
                }
                if (mEvent.getType() === MessageEvent.RoomMessageEncrypted)
                  return (
                    <Text>
                      <MessageNotDecryptedContent />
                    </Text>
                  );
                return (
                  <Text>
                    <MessageUnsupportedContent />
                  </Text>
                );
              }}
            </EncryptedContent>
          </Message>
        );
      },
      [MessageEvent.Sticker]: (mEventId, mEvent, item, timelineSet, collapse) => {
        const reactionRelations = getEventReactions(timelineSet, mEventId);
        const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
        const hasReactions = reactions && reactions.length > 0;
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;

        return (
          <Message
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            messageSpacing={messageSpacing}
            messageLayout={messageLayout}
            collapse={collapse}
            highlight={highlighted}
            canDelete={canRedact || (canDeleteOwn && mEvent.getSender() === mx.getUserId())}
            canSendReaction={canSendReaction}
            canPinEvent={canPinEvent}
            imagePackRooms={imagePackRooms}
            relations={hasReactions ? reactionRelations : undefined}
            onUserClick={handleUserClick}
            onUsernameClick={handleUsernameClick}
            onReplyClick={handleReplyClick}
            onReactionToggle={handleReactionToggle}
            reactions={
              reactionRelations && (
                <Reactions
                  style={{ marginTop: config.space.S200 }}
                  room={room}
                  relations={reactionRelations}
                  mEventId={mEventId}
                  canSendReaction={canSendReaction}
                  onReactionToggle={handleReactionToggle}
                />
              )
            }
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          >
            {mEvent.isRedacted() ? (
              <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
            ) : (
              <MSticker
                content={mEvent.getContent()}
                createdAt={mEvent.getTs()}
                renderImageContent={(props) => (
                  <ImageContent
                    {...props}
                    renderImage={(p) => <Image {...p} loading="lazy" />}
                    renderViewer={(p) => <ImageViewer {...p} />}
                  />
                )}
              />
            )}
          </Message>
        );
      },
      [MessageEvent.ElevoDiff]: (mEventId, mEvent, item, timelineSet, collapse) => {
        const reactionRelations = getEventReactions(timelineSet, mEventId);
        const reactions = reactionRelations && reactionRelations.getSortedAnnotationsByKey();
        const hasReactions = reactions && reactions.length > 0;
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const content = mEvent.getContent<Record<string, unknown>>();
        const diffSummary = summarizeElevoDiffContent(content);

        return (
          <Message
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            messageSpacing={messageSpacing}
            messageLayout={messageLayout}
            collapse={collapse}
            highlight={highlighted}
            canDelete={canRedact || (canDeleteOwn && mEvent.getSender() === mx.getUserId())}
            canSendReaction={canSendReaction}
            canPinEvent={false}
            canReplyInThread={false}
            imagePackRooms={imagePackRooms}
            relations={hasReactions ? reactionRelations : undefined}
            onUserClick={handleUserClick}
            onUsernameClick={handleUsernameClick}
            onReplyClick={handleReplyClick}
            onReactionToggle={handleReactionToggle}
            reactions={
              reactionRelations && (
                <Reactions
                  style={{ marginTop: config.space.S200 }}
                  room={room}
                  relations={reactionRelations}
                  mEventId={mEventId}
                  canSendReaction={canSendReaction}
                  onReactionToggle={handleReactionToggle}
                />
              )
            }
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          >
            {mEvent.isRedacted() ? (
              <RedactedContent reason={mEvent.getUnsigned().redacted_because?.content.reason} />
            ) : diffSummary ? (
              <DiffSummaryCard summary={diffSummary} />
            ) : (
              <Text>
                <MessageBrokenContent />
              </Text>
            )}
          </Message>
        );
      },
      [StateEvent.RoomMember]: (mEventId, mEvent, item) => {
        const membershipChanged = isMembershipChanged(mEvent);
        if (membershipChanged && hideMembershipEvents) return null;
        if (!membershipChanged && hideNickAvatarEvents) return null;

        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const parsed = parseMemberEvent(mEvent);

        const timeJSX = (
          <Time
            ts={mEvent.getTs()}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        );

        return (
          <Event
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            highlight={highlighted}
            messageSpacing={messageSpacing}
            canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
          >
            <EventContent
              messageLayout={messageLayout}
              time={timeJSX}
              content={
                <Box grow="No" direction="Column">
                  <Text size="T300">{parsed.body}</Text>
                </Box>
              }
            />
          </Event>
        );
      },
      [StateEvent.RoomName]: (mEventId, mEvent, item) => {
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const senderId = mEvent.getSender() ?? '';
        const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

        const timeJSX = (
          <Time
            ts={mEvent.getTs()}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        );

        return (
          <Event
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            highlight={highlighted}
            messageSpacing={messageSpacing}
            canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
          >
            <EventContent
              messageLayout={messageLayout}
              time={timeJSX}
              content={
                <Box grow="No" direction="Column">
                  <Text size="T300">{t('room.changedRoomName', { name: senderName })}</Text>
                </Box>
              }
            />
          </Event>
        );
      },
      [StateEvent.RoomTopic]: (mEventId, mEvent, item) => {
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const senderId = mEvent.getSender() ?? '';
        const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

        const timeJSX = (
          <Time
            ts={mEvent.getTs()}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        );

        return (
          <Event
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            highlight={highlighted}
            messageSpacing={messageSpacing}
            canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
          >
            <EventContent
              messageLayout={messageLayout}
              time={timeJSX}
              content={
                <Box grow="No" direction="Column">
                  <Text size="T300">{t('room.changedRoomTopic', { name: senderName })}</Text>
                </Box>
              }
            />
          </Event>
        );
      },
      [StateEvent.RoomAvatar]: (mEventId, mEvent, item) => {
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const senderId = mEvent.getSender() ?? '';
        const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

        const timeJSX = (
          <Time
            ts={mEvent.getTs()}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        );

        return (
          <Event
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            highlight={highlighted}
            messageSpacing={messageSpacing}
            canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
          >
            <EventContent
              messageLayout={messageLayout}
              time={timeJSX}
              content={
                <Box grow="No" direction="Column">
                  <Text size="T300">{t('room.changedRoomAvatar', { name: senderName })}</Text>
                </Box>
              }
            />
          </Event>
        );
      },
      [StateEvent.GroupCallMemberPrefix]: (mEventId, mEvent, item) => {
        const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
        const senderId = mEvent.getSender() ?? '';
        const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

        const content = mEvent.getContent<SessionMembershipData>();
        const prevContent = mEvent.getPrevContent();

        const callJoined = content.application;
        if (callJoined && 'application' in prevContent) {
          return null;
        }

        const timeJSX = (
          <Time
            ts={mEvent.getTs()}
            compact={messageLayout === MessageLayout.Compact}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        );

        return (
          <Event
            key={mEvent.getId()}
            data-message-item={item}
            data-message-id={mEventId}
            room={room}
            mEvent={mEvent}
            highlight={highlighted}
            messageSpacing={messageSpacing}
            canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
            hideReadReceipts={hideActivity}
            showDeveloperTools={showDeveloperTools}
          >
            <EventContent
              messageLayout={messageLayout}
              time={timeJSX}
              content={
                <Box grow="No" direction="Column">
                  <Text size="T300">
                    {callJoined
                      ? t('timeline.joinedCall', { name: senderName })
                      : t('timeline.endedCall', { name: senderName })}
                  </Text>
                </Box>
              }
            />
          </Event>
        );
      },
    },
    (mEventId, mEvent, item) => {
      if (!showHiddenEvents) return null;
      const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = (
        <Time
          ts={mEvent.getTs()}
          compact={messageLayout === MessageLayout.Compact}
          hour24Clock={hour24Clock}
          dateFormatString={dateFormatString}
        />
      );

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
          hideReadReceipts={hideActivity}
          showDeveloperTools={showDeveloperTools}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            content={
              <Box grow="No" direction="Column">
                <Text size="T300">
                  {t('timeline.sentStateEvent', {
                    name: senderName,
                    eventType: mEvent.getType(),
                  })}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
    (mEventId, mEvent, item) => {
      if (!showHiddenEvents) return null;
      if (Object.keys(mEvent.getContent()).length === 0) return null;
      if (mEvent.getRelation()) return null;
      if (mEvent.isRedaction()) return null;

      const highlighted = focusItem?.eventId === mEventId && focusItem.highlight;
      const senderId = mEvent.getSender() ?? '';
      const senderName = getMemberDisplayName(room, senderId) || getMxIdLocalPart(senderId);

      const timeJSX = (
        <Time
          ts={mEvent.getTs()}
          compact={messageLayout === MessageLayout.Compact}
          hour24Clock={hour24Clock}
          dateFormatString={dateFormatString}
        />
      );

      return (
        <Event
          key={mEvent.getId()}
          data-message-item={item}
          data-message-id={mEventId}
          room={room}
          mEvent={mEvent}
          highlight={highlighted}
          messageSpacing={messageSpacing}
          canDelete={canRedact || mEvent.getSender() === mx.getUserId()}
          hideReadReceipts={hideActivity}
          showDeveloperTools={showDeveloperTools}
        >
          <EventContent
            messageLayout={messageLayout}
            time={timeJSX}
            content={
              <Box grow="No" direction="Column">
                <Text size="T300">
                  {t('timeline.sentEvent', {
                    name: senderName,
                    eventType: mEvent.getType(),
                  })}
                </Text>
              </Box>
            }
          />
        </Event>
      );
    },
  );

  let prevEvent: MatrixEvent | undefined;
  let prevRenderedEvent: MatrixEvent | undefined;
  let newDivider = false;
  let dayDivider = false;
  const eventRenderer = (item: number) => {
    const [eventTimeline, baseIndex] = getTimelineAndBaseIndex(timeline.linkedTimelines, item);
    if (!eventTimeline) return null;
    const itemTimelineSet = eventTimeline?.getTimelineSet();
    const mEvent = getTimelineEvent(eventTimeline, getTimelineRelativeIndex(item, baseIndex));
    const mEventId = mEvent?.getId();

    if (!mEvent || !mEventId) return null;

    const eventSender = mEvent.getSender();
    if (eventSender && ignoredUsersSet.has(eventSender)) {
      return null;
    }

    if (!newDivider && readUptoEventIdRef.current) {
      newDivider = prevEvent?.getId() === readUptoEventIdRef.current;
    }
    if (!dayDivider) {
      dayDivider = prevEvent ? !inSameDay(prevEvent.getTs(), mEvent.getTs()) : true;
    }

    const collapsed =
      !dayDivider &&
      (!newDivider || eventSender === mx.getUserId()) &&
      prevRenderedEvent !== undefined &&
      prevRenderedEvent.getSender() === eventSender &&
      prevRenderedEvent.getType() === mEvent.getType() &&
      secondDifference(prevRenderedEvent.getTs(), mEvent.getTs()) <= 90;

    const eventJSX =
      reactionOrEditEvent(mEvent) || isUserAnswerEvent(mEvent)
        ? null
        : renderMatrixEvent(
            mEvent.getType(),
            typeof mEvent.getStateKey() === 'string',
            mEventId,
            mEvent,
            item,
            itemTimelineSet,
            collapsed,
          );
    prevEvent = mEvent;
    if (eventJSX) {
      prevRenderedEvent = mEvent;
    }

    const newDividerJSX =
      newDivider && eventJSX && eventSender !== mx.getUserId() ? (
        <MessageBase space={messageSpacing}>
          <TimelineDivider>
            <Badge as="span" size="500" variant="Success" fill="Soft" radii="300">
              <Text size="L400">{t('room.newMessages')}</Text>
            </Badge>
          </TimelineDivider>
        </MessageBase>
      ) : null;

    const dayDividerJSX =
      dayDivider && eventJSX ? (
        <MessageBase space={messageSpacing}>
          <TimelineDivider>
            <Badge as="span" size="500" variant="Secondary" fill="None" radii="300">
              <Text size="T200" priority="300">
                {(() => {
                  if (today(mEvent.getTs())) return t('room.today');
                  if (yesterday(mEvent.getTs())) return t('room.yesterday');
                  return timeDayMonthYear(mEvent.getTs(), dateFormatString);
                })()}
              </Text>
            </Badge>
          </TimelineDivider>
        </MessageBase>
      ) : null;

    if (eventJSX && (newDividerJSX || dayDividerJSX)) {
      if (newDividerJSX) newDivider = false;
      if (dayDividerJSX) dayDivider = false;

      return (
        <React.Fragment key={mEventId}>
          {newDividerJSX}
          {dayDividerJSX}
          {eventJSX}
        </React.Fragment>
      );
    }

    return eventJSX;
  };

  return (
    <Box grow="Yes" style={{ position: 'relative' }}>
      {unreadInfo?.readUptoEventId && !unreadInfo?.inLiveTimeline && (
        <TimelineFloat position="Top">
          <Chip
            variant="Primary"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.MessageUnread} />}
            onClick={handleJumpToUnread}
          >
            <Text size="L400">{t('room.jumpToUnread')}</Text>
          </Chip>

          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.CheckTwice} />}
            onClick={handleMarkAsRead}
          >
            <Text size="L400">{t('room.markAsRead')}</Text>
          </Chip>
        </TimelineFloat>
      )}
      <Scroll ref={scrollRef} visibility="Hover" hideTrack>
        <Box
          ref={scrollContentRef}
          direction="Column"
          justifyContent="End"
          style={{ minHeight: '100%', padding: `${config.space.S600} 0` }}
        >
          {!thread && !canPaginateBack && rangeAtStart && getItems().length > 0 && (
            <div
              style={{
                padding: `${config.space.S700} ${config.space.S400} ${config.space.S600} ${
                  messageLayout === MessageLayout.Compact ? config.space.S400 : toRem(64)
                }`,
              }}
            >
              <RoomIntro room={room} />
            </div>
          )}
          {(canPaginateBack || !rangeAtStart) && (
            <div ref={observeBackAnchor} aria-hidden style={PAGINATION_SENTINEL_STYLE} />
          )}

          {getItems().map(eventRenderer)}

          {(!liveTimelineLinked || !rangeAtEnd) && (
            <div ref={observeFrontAnchor} aria-hidden style={PAGINATION_SENTINEL_STYLE} />
          )}
        </Box>
      </Scroll>
      {scrollable && (
        <TimelineFloat position="Bottom">
          <Chip
            variant="SurfaceVariant"
            radii="Pill"
            outlined
            before={<Icon size="50" src={Icons.ArrowBottom} />}
            onClick={handleJumpToLatest}
          >
            <Text size="L400">{t('room.jumpToLatest')}</Text>
          </Chip>
        </TimelineFloat>
      )}
    </Box>
  );
}
