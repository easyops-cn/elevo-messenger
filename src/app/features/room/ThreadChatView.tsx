import React from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Box, Text, TooltipProvider, Tooltip, Icon, Icons, IconButton, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageHeader, PageMain } from '../../components/page';
import { threadChatAtom } from '../../state/threadChat';
import { RoomView } from './RoomView';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

export function ThreadChatView() {
  const { t } = useTranslation();
  const { threadRootId } = useAtomValue(threadChatAtom);
  const setThreadChat = useSetAtom(threadChatAtom);
  const screenSize = useScreenSizeContext();

  const handleClose = () => setThreadChat({ open: false, threadRootId: undefined });

  return (
    <PageMain
      style={{
        width: screenSize === ScreenSize.Desktop ? toRem(456) : '100%',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
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
          {threadRootId && (
            <RoomView key={threadRootId} threadRootId={threadRootId} showRoomIntro={false} />
          )}
        </Box>
      </Page>
    </PageMain>
  );
}
