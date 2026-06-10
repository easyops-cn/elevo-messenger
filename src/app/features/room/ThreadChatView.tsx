import React, { FormEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  Header,
  Icon,
  Icons,
  IconButton,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  TooltipProvider,
  Tooltip,
  color,
  config,
} from 'folds';
import { useTranslation } from 'react-i18next';
import { RoomEvent, type RoomEventHandlerMap, type Thread } from 'matrix-js-sdk';
import type { TimelineEvents } from 'matrix-js-sdk/lib/@types/event';
import FocusTrap from 'focus-trap-react';
import { Page, PageHeader, PageMain } from '../../components/page';
import { useThreadChat } from '../../state/threadChat';
import { RoomView } from './RoomView';
import { useRoom } from '../../hooks/useRoom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { PageSpinner } from '../../components/PageSpinner';
import { useThreadTopic } from '../../hooks/useThreadTopic';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getThreadTopicContent } from '../../utils/room';
import { MessageEvent } from '../../../types/matrix/room';
import { stopPropagation } from '../../utils/keyboard';
import { PencilIcon } from '../../icons/PencilIcon';
import { XIcon } from '../../icons/XIcon';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { Maximize2Icon } from '../../icons/Maximize2Icon';
import { Minimize2Icon } from '../../icons/Minimize2Icon';
import { MessageSquareTextIcon } from '../../icons/MessageSquareTextIcon';
import * as css from './ThreadChatView.css';

const THREAD_TOPIC_MAX_LENGTH = 120;
const THREAD_TOPIC_EVENT_TYPE = MessageEvent.ThreadTopic as unknown as keyof TimelineEvents;

type ThreadTopicDialogProps = {
  roomId: string;
  rootEventId: string;
  topic?: string;
  requestClose: () => void;
};

function ThreadTopicDialog({ roomId, rootEventId, topic, requestClose }: ThreadTopicDialogProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const topicInputRef = useRef<HTMLInputElement>(null);

  const [submitState, submit] = useAsyncCallback(
    useCallback(
      (nextTopic: string) =>
        mx.sendEvent(
          roomId,
          THREAD_TOPIC_EVENT_TYPE,
          getThreadTopicContent(
            rootEventId,
            nextTopic,
          ) as TimelineEvents[typeof THREAD_TOPIC_EVENT_TYPE],
        ),
      [mx, roomId, rootEventId],
    ),
  );

  const submitting = submitState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (submitting) return;

    const target = evt.target as HTMLFormElement | undefined;
    const topicInput = target?.topicInput as HTMLInputElement | undefined;
    const nextTopic = topicInput?.value.trim();
    if (!nextTopic || nextTopic === topic) return;

    submit(nextTopic).then(requestClose);
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => topicInputRef.current,
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">{t('room.threadTopic')}</Text>
              </Box>
              <IconButton size="300" onClick={requestClose} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box
              as="form"
              onSubmit={handleSubmit}
              style={{ padding: config.space.S400 }}
              direction="Column"
              gap="400"
            >
              <Box direction="Column" gap="100">
                <Text size="L400">{t('room.threadTopic')}</Text>
                <Input
                  ref={topicInputRef}
                  name="topicInput"
                  variant="Background"
                  defaultValue={topic}
                  maxLength={THREAD_TOPIC_MAX_LENGTH}
                  required
                />
                {submitState.status === AsyncStatus.Error && (
                  <Text style={{ color: color.Critical.Main }} size="T300">
                    {t('room.threadTopicSaveFailed')}
                  </Text>
                )}
              </Box>
              <Button
                type="submit"
                variant="Primary"
                before={
                  submitting ? <Spinner fill="Solid" variant="Primary" size="200" /> : undefined
                }
                aria-disabled={submitting}
              >
                <Text size="B400">
                  {submitting ? t('room.threadTopicSaving') : t('room.threadTopicSave')}
                </Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type ThreadChatViewProps = {
  eventId?: string;
  maximized?: boolean;
  onMaximizedChange?: (maximized: boolean) => void;
};

export function ThreadChatView({ eventId, maximized, onMaximizedChange }: ThreadChatViewProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const screenSize = useScreenSizeContext();
  const [threadChat, setThreadChat] = useThreadChat(room.roomId);
  const { threadRootId } = threadChat;
  const [thread, setThread] = useState<Thread | null>(null);
  const [ready, setReady] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  useEffect(() => {
    if (!threadRootId) return;
    setThread(null);
    setReady(false);
    room
      .createThreadsTimelineSets()
      .then(() => room.fetchRoomThreads())
      .then(async () => {
        const newThread = room.getThread(threadRootId);
        setThread(newThread);
      });
  }, [room, threadRootId]);

  useEffect(() => {
    if (!thread) return;

    if (thread.events.length > 0) {
      setReady(true);
      return;
    }

    const handleTimelineReset: RoomEventHandlerMap[RoomEvent.TimelineReset] = async (
      _room,
      timelineSet,
    ) => {
      if (timelineSet !== thread.timelineSet) return;
      if (thread.events.length === 0) {
        await mx.paginateEventTimeline(thread.liveTimeline, {
          backwards: true,
        });
      }
      setReady(true);
    };

    thread.on(RoomEvent.TimelineReset, handleTimelineReset);

    return () => {
      thread.off(RoomEvent.TimelineReset, handleTimelineReset);
    };
  }, [mx, thread]);

  const handleClose = () => {
    onMaximizedChange?.(false);
    setThreadChat({ open: false, threadRootId: undefined });
  };
  const threadTopic = useThreadTopic(room, thread?.rootEvent);
  const threadRootEventId = thread?.rootEvent?.getId();
  const canSetThreadTopic =
    !!threadRootEventId && thread?.rootEvent?.getSender() === mx.getSafeUserId();

  return (
    <PageMain isSidePanel={!maximized}>
      <Page>
        <PageHeader className={css.ThreadHeader}>
          <Box grow="Yes" alignItems="Center" gap="200">
            <Box className={css.ThreadTitle} grow="Yes" alignItems="Center" gap="200">
              <Icon src={MessageSquareTextIcon} size="100" />
              <Text size="H5" truncate>
                {threadTopic ?? t('room.thread')}
              </Text>
              {canSetThreadTopic && (
                <TooltipProvider
                  position="Bottom"
                  align="Start"
                  offset={4}
                  tooltip={
                    <Tooltip>
                      <Text>{t(threadTopic ? 'room.threadTopicEdit' : 'room.threadTopicSet')}</Text>
                    </Tooltip>
                  }
                >
                  {(triggerRef) => (
                    <IconButton
                      className={css.ThreadTopicEditButton}
                      ref={triggerRef}
                      variant="Surface"
                      onClick={() => setTopicDialogOpen(true)}
                    >
                      <Icon src={PencilIcon} size="50" />
                    </IconButton>
                  )}
                </TooltipProvider>
              )}
            </Box>
            <Box shrink="No" alignItems="Center" gap="100">
              {screenSize === ScreenSize.Desktop && (
                <TooltipProvider
                  position="Bottom"
                  align="End"
                  offset={4}
                  tooltip={
                    <Tooltip>
                      <Text>{maximized ? t('room.restoreThread') : t('room.maximizeThread')}</Text>
                    </Tooltip>
                  }
                >
                  {(triggerRef) => (
                    <IconButton
                      ref={triggerRef}
                      variant="Surface"
                      onClick={() => onMaximizedChange?.(!maximized)}
                    >
                      <Icon src={maximized ? Minimize2Icon : Maximize2Icon} size="50" />
                    </IconButton>
                  )}
                </TooltipProvider>
              )}
              <TooltipProvider
                position="Bottom"
                align="End"
                offset={4}
                tooltip={
                  <Tooltip>
                    <Text>{t('common.close')}</Text>
                  </Tooltip>
                }
              >
                {(triggerRef) => (
                  <IconButton ref={triggerRef} variant="Surface" onClick={handleClose}>
                    <Icon src={XIcon} size="50" />
                  </IconButton>
                )}
              </TooltipProvider>
            </Box>
          </Box>
        </PageHeader>
        <Box grow="Yes" direction="Column">
          {thread && ready ? (
            <RoomView key={thread.id} thread={thread} eventId={eventId} />
          ) : (
            <PageSpinner />
          )}
        </Box>
        {topicDialogOpen && threadRootEventId && (
          <ThreadTopicDialog
            roomId={room.roomId}
            rootEventId={threadRootEventId}
            topic={threadTopic}
            requestClose={() => setTopicDialogOpen(false)}
          />
        )}
      </Page>
    </PageMain>
  );
}
