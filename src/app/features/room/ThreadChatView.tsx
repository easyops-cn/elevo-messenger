import React, { useEffect, useState } from 'react';
import { Box, Text, TooltipProvider, Tooltip, Icon, Icons, IconButton } from 'folds';
import { useTranslation } from 'react-i18next';
import { RoomEvent, type RoomEventHandlerMap, type Thread } from 'matrix-js-sdk';
import { Page, PageHeader, PageMain } from '../../components/page';
import { useThreadChat } from '../../state/threadChat';
import { RoomView } from './RoomView';
import { useRoom } from '../../hooks/useRoom';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { PageSpinner } from '../../components/PageSpinner';

export function ThreadChatView({ eventId }: { eventId?: string }) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const room = useRoom();
  const [threadChat, setThreadChat] = useThreadChat(room.roomId);
  const { threadRootId } = threadChat;
  const [thread, setThread] = useState<Thread | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!threadRootId) return;
    setThread(null);
    setReady(false);
    room.createThreadsTimelineSets()
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

    const handleTimelineReset: RoomEventHandlerMap[RoomEvent.TimelineReset] = async (_room, timelineSet) => {
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

  const handleClose = () => setThreadChat({ open: false, threadRootId: undefined });

  return (
    <PageMain isSidePanel>
      <Page>
        <PageHeader>
          <Box grow="Yes" alignItems="Center" gap="200">
            <Box grow="Yes">
              <Text size="H5" truncate>
                {t('room.thread')}
              </Text>
            </Box>
            <Box shrink="No" alignItems="Center">
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
                    <Icon src={Icons.Cross} />
                  </IconButton>
                )}
              </TooltipProvider>
            </Box>
          </Box>
        </PageHeader>
        <Box grow="Yes" direction="Column">
          {thread && ready ? (
            <RoomView key={thread.id} thread={thread} eventId={eventId} />
          ) : <PageSpinner />}
        </Box>
      </Page>
    </PageMain>
  );
}
