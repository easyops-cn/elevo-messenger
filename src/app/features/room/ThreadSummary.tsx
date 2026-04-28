import React, { useMemo } from 'react';
import { MatrixEvent, Room, type Thread } from 'matrix-js-sdk';
import { Badge, Box, Chip, Icon, Icons, Text, config, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { MessageSquareTextIcon } from '../../icons/MessageSquareTextIcon';
import { Avatar } from '../../components/avatar';
import { UserAvatar } from '../../components/user-avatar';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useThreadUnreadBadge } from '../../hooks/useThreadUnreadBadge';
import { getMxIdLocalPart } from '../../utils/matrix';
import {
  getLatestMessageText,
  getMemberDisplayName,
} from '../../utils/room';

type ThreadSummaryProps = {
  mEvent: MatrixEvent;
  room: Room;
  thread: Thread;
  onOpenThread: React.MouseEventHandler;
};

export function ThreadSummary({ mEvent, room, thread,  onOpenThread }: ThreadSummaryProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { t } = useTranslation();

  const mEventId = mEvent.getId() ?? thread.id;
  const hasThreadUnreadBadge = useThreadUnreadBadge({
    room,
    thread,
    threadId: mEventId,
  });
  const threadLastReply = thread.replyToEvent;

  const {
    threadSummary,
    threadLastReplySenderId,
    threadLastReplySenderName,
    threadLastReplyAvatarUrl,
  } = useMemo(() => {
    const summary = threadLastReply
      ? getLatestMessageText(room, threadLastReply, mx.getSafeUserId(), false, t)
      : undefined;

    const lastReplySenderId = threadLastReply?.getSender();
    const lastReplySenderName = lastReplySenderId
      ? getMemberDisplayName(room, lastReplySenderId) ??
        getMxIdLocalPart(lastReplySenderId) ??
        lastReplySenderId
      : undefined;

    const threadLastReplyAvatarMxcUrl = lastReplySenderId
      ? room.getMember(lastReplySenderId)?.getMxcAvatarUrl()
      : undefined;
    const lastReplyAvatarUrl = threadLastReplyAvatarMxcUrl
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
    return {
      threadSummary: summary,
      threadLastReplySenderId: lastReplySenderId,
      threadLastReplySenderName: lastReplySenderName,
      threadLastReplyAvatarUrl: lastReplyAvatarUrl,
    };
  }, [mx, room, threadLastReply, t, useAuthentication]);

  return (
    <Chip
      as="button"
      variant="SurfaceVariant"
      size="500"
      radii="400"
      data-event-id={mEventId}
      before={
        <>
          <Box shrink="No" style={{ position: 'relative', display: 'inline-flex' }}>
            <Icon size="50" src={MessageSquareTextIcon} />
            {hasThreadUnreadBadge && (
              <Badge
                variant="Critical"
                fill="Solid"
                size="200"
                radii="Pill"
                style={{ position: 'absolute', top: toRem(-2), right: toRem(-2) }}
              />
            )}
          </Box>
          <Text size="T200" style={{ flexShrink: 0 }}>
            {t('message.threadReplies', { count: thread.length })}
          </Text>
        </>
      }
      onClick={onOpenThread}
      style={{ marginTop: config.space.S200, width: 'fit-content', maxWidth: toRem(600) }}
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
