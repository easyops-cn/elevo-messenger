import React, { MouseEventHandler, useMemo } from 'react';
import { Room, type Thread } from 'matrix-js-sdk';
import { Badge, Box, Icon, Icons, MenuItem, Text, config, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/avatar';
import { UserAvatar } from '../../components/user-avatar';
import { useThreadUnreadBadge } from '../../hooks/useThreadUnreadBadge';
import { getMxIdLocalPart } from '../../utils/matrix';
import {
  getEditedEvent,
  getLatestMessageText,
  getLatestMessageTextFromContent,
  getMemberDisplayName,
} from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RelativeTime } from '../../components/RelativeTime';
import { MessageDeletedContent } from '../../components/message';

type ThreadMenuItemProps = {
  useAuthentication: boolean;
  room: Room;
  thread: Thread;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

function ThreadReplyRelationIcon() {
  return (
    <svg
      width="18"
      height="20"
      viewBox="0 0 18 20"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ display: 'block', opacity: 0.45 }}
    >
      <path
        d="M9 3V6C9 8.20914 10.7909 10 13 10H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThreadMenuItem({ useAuthentication, room, thread, onClick }: ThreadMenuItemProps) {
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
    rootIsRedacted,
    rootSenderId,
    rootSenderName,
    rootAvatarUrl,
    latestReplySummary,
    latestReplySenderId,
    latestReplySenderName,
    latestReplyAvatarUrl,
    latestTs,
  } = useMemo(() => {
    const root = threadEvent
      ? getLatestMessageText(room, threadEvent, mx.getSafeUserId(), false, t, false, false)
      : undefined;
    const rIsRedacted = threadEvent?.isRedacted() ?? false;
    const rSenderId = threadEvent?.getSender();
    const rSenderName = rSenderId
      ? (getMemberDisplayName(room, rSenderId) ?? getMxIdLocalPart(rSenderId) ?? rSenderId)
      : undefined;
    const rootAvatarMxcUrl = rSenderId ? room.getMember(rSenderId)?.getMxcAvatarUrl() : undefined;
    const rootAvatar = rootAvatarMxcUrl
      ? mx.mxcUrlToHttp(rootAvatarMxcUrl, 64, 64, 'crop', undefined, false, useAuthentication)
      : undefined;
    const latestReplyId = threadLastReply?.getId();
    const editedLastReply =
      latestReplyId && threadLastReply
        ? getEditedEvent(latestReplyId, threadLastReply, thread.timelineSet)
        : undefined;
    const latestReplyContent = editedLastReply?.getContent()['m.new_content'];
    const latestSummary =
      threadLastReply && latestReplyContent
        ? getLatestMessageTextFromContent(
            room,
            threadLastReply,
            latestReplyContent,
            mx.getSafeUserId(),
            false,
            t,
            false,
            false,
          )
        : threadLastReply
          ? getLatestMessageText(room, threadLastReply, mx.getSafeUserId(), false, t, false)
          : undefined;
    const senderId = threadLastReply?.getSender();
    const senderName = senderId
      ? (getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId)
      : undefined;
    const avatarMxcUrl = senderId ? room.getMember(senderId)?.getMxcAvatarUrl() : undefined;
    const avatarUrl = avatarMxcUrl
      ? mx.mxcUrlToHttp(avatarMxcUrl, 64, 64, 'crop', undefined, false, useAuthentication)
      : undefined;
    const ts = threadLastReply?.getTs() ?? threadEvent?.getTs();

    return {
      rootSummary: root,
      rootIsRedacted: rIsRedacted,
      rootSenderId: rSenderId,
      rootSenderName: rSenderName,
      rootAvatarUrl: rootAvatar,
      latestReplySummary: latestSummary,
      latestReplySenderId: senderId,
      latestReplySenderName: senderName,
      latestReplyAvatarUrl: avatarUrl,
      latestTs: ts,
    };
  }, [mx, room, thread, threadEvent, threadLastReply, t, useAuthentication]);

  return (
    <MenuItem
      data-event-id={thread.id}
      style={{ padding: `0 ${config.space.S200}`, height: toRem(52) }}
      variant="Background"
      radii="400"
      onClick={onClick}
    >
      <Box grow="Yes" direction="Column" gap="100">
        <Box alignItems="Center" gap="100">
          {rootSenderId && (
            <Box shrink="No">
              <Avatar size="100" radii="Pill">
                <UserAvatar
                  userId={rootSenderId}
                  src={rootAvatarUrl ?? undefined}
                  alt={rootSenderName ?? rootSenderId}
                  renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                />
              </Avatar>
            </Box>
          )}
          <Text size="T300" truncate style={{ flexGrow: 1 }}>
            {rootIsRedacted ? (
              <MessageDeletedContent />
            ) : (
              (rootSummary ?? t('message.threadLatestReplyFallback'))
            )}
          </Text>
        </Box>
        <Box alignItems="Center" gap="100">
          <Box
            shrink="No"
            style={{
              width: toRem(18),
              height: toRem(20),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'currentColor',
            }}
          >
            <ThreadReplyRelationIcon />
          </Box>
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
            {latestReplySenderId ? (latestReplySummary ?? '...') : t('message.threadNoReplies')}
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
