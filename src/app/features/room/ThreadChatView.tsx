import React, { useEffect, useState } from 'react';
import { Box, Text, TooltipProvider, Tooltip, Icon, Icons, IconButton } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader, PageMain } from '../../components/page';
import { useThreadChat } from '../../state/threadChat';
import { RoomView } from './RoomView';
import { useRoom } from '../../hooks/useRoom';

export function ThreadChatView() {
  const { t } = useTranslation();
  const room = useRoom();
  const [threadChat, setThreadChat] = useThreadChat(room.roomId);
  const { threadRootId } = threadChat;
  
  const [threadReady, setThreadReady] = useState(false);

  useEffect(() => {
    room.createThreadsTimelineSets()
      .then(() => room.fetchRoomThreads())
      .then(() => {
        setThreadReady(true);
      });
  }, [room]);

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
          {threadRootId && threadReady && (
            <RoomView key={threadRootId} threadRootId={threadRootId} showRoomIntro={false} />
          )}
        </Box>
      </Page>
    </PageMain>
  );
}
