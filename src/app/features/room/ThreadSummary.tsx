import React from 'react';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { Box, Chip, Icon, Icons, Text, config, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { MessageSquareTextIcon } from '../../icons/MessageSquareTextIcon';
import { Avatar } from '../../components/avatar';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getLatestMessageText, getMemberDisplayName } from '../../utils/room';

type ThreadSummaryProps = {
  mEvent: MatrixEvent;
  room: Room;
  onOpenThread: React.MouseEventHandler;
};

export function ThreadSummary({ mEvent, room, onOpenThread }: ThreadSummaryProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { t } = useTranslation();

  const mEventId = mEvent.getId()!;
  const thread = mEvent.getThread();
  const threadReplyCount = Math.max(thread?.length ?? 0, 0);
  const threadLastReply = thread?.replyToEvent;

  const threadSummary = threadLastReply
    ? getLatestMessageText(room, threadLastReply, mx.getSafeUserId(), false, t)
    : undefined;

  const threadLastReplySenderId = threadLastReply?.getSender();
  const threadLastReplySenderName = threadLastReplySenderId
    ? getMemberDisplayName(room, threadLastReplySenderId) ??
      getMxIdLocalPart(threadLastReplySenderId) ??
      threadLastReplySenderId
    : undefined;

  const threadLastReplyAvatarMxcUrl = threadLastReplySenderId
    ? room.getMember(threadLastReplySenderId)?.getMxcAvatarUrl()
    : undefined;
  const threadLastReplyAvatarUrl = threadLastReplyAvatarMxcUrl
    ? mx.mxcUrlToHttp(
        threadLastReplyAvatarMxcUrl,
        48,
        48,
        'crop',
        undefined,
        false,
        useAuthentication
      )
    : undefined;

  return (
    <Chip
      as="button"
      variant="SurfaceVariant"
      size="500"
      radii="400"
      data-event-id={mEventId}
      before={
        <>
          <Icon size="50" src={MessageSquareTextIcon} />
          <Text size="T200" style={{ flexShrink: 0 }}>
            {t('message.threadReplies', { count: threadReplyCount })}
          </Text>
        </>
      }
      onClick={onOpenThread}
      style={{ marginTop: config.space.S200, width: '100%', maxWidth: toRem(600) }}
    >
      <Box alignItems="Center" gap="100" grow="Yes">
        {threadLastReplySenderId ? (
          <>
            <Avatar size="100" radii="Pill">
              <UserAvatar
                userId={threadLastReplySenderId}
                src={threadLastReplyAvatarUrl ?? undefined}
                alt={threadLastReplySenderName ?? threadLastReplySenderId}
                renderFallback={() => <Icon size="50" src={Icons.User} filled />}
              />
            </Avatar>
            <Text size="T200" truncate>
              {threadLastReplySenderName}: {threadSummary ?? t('message.threadNoReplies')}
            </Text>
          </>
        ) : (
          <Text size="T200" truncate>
            {t('message.threadNoReplies')}
          </Text>
        )}
      </Box>
    </Chip>
  );
}
