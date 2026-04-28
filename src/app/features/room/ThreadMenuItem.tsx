import React, { MouseEventHandler, useMemo } from 'react';
import { Room, type Thread } from 'matrix-js-sdk';
import { Badge, Box, Icon, Icons, MenuItem, Text, config, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/avatar';
import { UserAvatar } from '../../components/user-avatar';
import { useThreadUnreadBadge } from '../../hooks/useThreadUnreadBadge';
import { getMxIdLocalPart } from '../../utils/matrix';
import { getLatestMessageText, getMemberDisplayName } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RelativeTime } from '../../components/RelativeTime';

type ThreadMenuItemProps = {
  useAuthentication: boolean;
  room: Room;
  thread: Thread;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export function ThreadMenuItem({
  useAuthentication,
  room,
  thread,
  onClick,
}: ThreadMenuItemProps) {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const mEventId = thread.id;
  const hasThreadUnreadBadge = useThreadUnreadBadge({
    room,
    thread,
    threadId: mEventId,
  });

  const threadEvent = thread.rootEvent;
  const threadLastReply = thread.replyToEvent;

  const {
    rootSummary,
    latestReplySummary,
    latestReplySenderId,
    latestReplySenderName,
    latestReplyAvatarUrl,
    latestTs,
  } = useMemo(() => {
    const root = threadEvent
      ? getLatestMessageText(room, threadEvent, mx.getSafeUserId(), false, t)
      : undefined;
    const latestSummary = threadLastReply
      ? getLatestMessageText(room, threadLastReply, mx.getSafeUserId(), false, t, false)
      : undefined;
    const senderId = threadLastReply?.getSender();
    const senderName = senderId
      ? getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId
      : undefined;
    const avatarMxcUrl = senderId ? room.getMember(senderId)?.getMxcAvatarUrl() : undefined;
    const avatarUrl = avatarMxcUrl
      ? mx.mxcUrlToHttp(avatarMxcUrl, 64, 64, 'crop', undefined, false, useAuthentication)
      : undefined;
    const ts = threadLastReply?.getTs() ?? threadEvent?.getTs();

    return {
      rootSummary: root,
      latestReplySummary: latestSummary,
      latestReplySenderId: senderId,
      latestReplySenderName: senderName,
      latestReplyAvatarUrl: avatarUrl,
      latestTs: ts,
    };
  }, [mx, room, threadEvent, threadLastReply, t, useAuthentication]);

  return (
    <MenuItem
      data-event-id={thread.id}
      style={{ padding: `0 ${config.space.S200}`, height: toRem(52) }}
      variant="Background"
      radii="400"
      onClick={onClick}
    >
      <Box grow="Yes" direction="Column" gap="100">
        <Text size="T300" truncate>
          {rootSummary ?? t('message.threadLatestReplyFallback')}
        </Text>
          <Box alignItems="Center" gap="100">
            {latestReplySenderId && (
              <Box shrink="No" style={{ position: 'relative' }}>
                <Avatar size="100" radii="Pill">
                  <UserAvatar
                    userId={latestReplySenderId}
                    src={latestReplyAvatarUrl ?? undefined}
                    alt={latestReplySenderName ?? latestReplySenderId}
                    renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                  />
                </Avatar>
                {hasThreadUnreadBadge && (
                  <Badge
                    variant="Critical"
                    fill="Solid"
                    size="200"
                    radii="Pill"
                    style={{ position: 'absolute', top: toRem(-3), right: toRem(-3) }}
                  />
                )}
              </Box>
            )}
            <Text size="T200" priority="300" truncate style={{ flexGrow: 1 }}>
              {latestReplySenderId ? (latestReplySummary ?? '...'): t('message.threadNoReplies')}
            </Text>
            {latestTs && (
              <Text size="T200" style={{ flexShrink: 0, opacity: 0.5 }}>
                <RelativeTime ts={latestTs} />
              </Text>
            )}
        </Box>
      </Box>
    </MenuItem>
  );
}
