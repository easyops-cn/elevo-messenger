import React, { useEffect, useMemo, useState } from 'react';
import { MatrixEvent, RelationType, Room, RoomEvent, type Thread } from 'matrix-js-sdk';
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
  getEditedEvent,
  getLatestMessageText,
  getLatestMessageTextFromContent,
  getMemberDisplayName,
  trimThreadSummaryPrefix,
} from '../../utils/room';
import { useThreadTopic } from '../../hooks/useThreadTopic';

type ThreadSummaryProps = {
  mEvent: MatrixEvent;
  room: Room;
  thread: Thread;
  onOpenThread: React.MouseEventHandler;
};

export function ThreadSummary({ mEvent, room, thread, onOpenThread }: ThreadSummaryProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { t } = useTranslation();

  const mEventId = mEvent.getId() ?? thread.id;
  const [editVersion, setEditVersion] = useState(0);
  const threadTopic = useThreadTopic(room, mEvent);
  const hasThreadUnreadBadge = useThreadUnreadBadge({
    room,
    thread,
    threadId: mEventId,
  });
  const threadLastReply = thread.replyToEvent;
  const threadLastReplyId = threadLastReply?.getId();

  useEffect(() => {
    if (!threadLastReplyId) return undefined;

    const handleTimelineEvent = (timelineEvent: MatrixEvent) => {
      if (
        timelineEvent.isRelation(RelationType.Replace) &&
        timelineEvent.getAssociatedId() === threadLastReplyId
      ) {
        setEditVersion((version) => version + 1);
      }
    };

    thread.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      thread.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [thread, threadLastReplyId]);

  const {
    threadSummary,
    threadLastReplySenderId,
    threadLastReplySenderName,
    threadLastReplyAvatarUrl,
  } = useMemo(() => {
    const lastReplyId = threadLastReply?.getId();
    const editedLastReply =
      editVersion >= 0 && lastReplyId && threadLastReply
        ? getEditedEvent(lastReplyId, threadLastReply, thread.timelineSet)
        : undefined;
    const latestReplyContent = editedLastReply?.getContent()['m.new_content'];
    const latestReplySummary =
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
    const summary = latestReplySummary ? trimThreadSummaryPrefix(latestReplySummary) : undefined;

    const lastReplySenderId = threadLastReply?.getSender();
    const lastReplySenderName = lastReplySenderId
      ? (getMemberDisplayName(room, lastReplySenderId) ??
        getMxIdLocalPart(lastReplySenderId) ??
        lastReplySenderId)
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
          useAuthentication,
        )
      : undefined;
    return {
      threadSummary: summary,
      threadLastReplySenderId: lastReplySenderId,
      threadLastReplySenderName: lastReplySenderName,
      threadLastReplyAvatarUrl: lastReplyAvatarUrl,
    };
  }, [mx, room, thread, threadLastReply, editVersion, t, useAuthentication]);

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
      style={{
        marginTop: config.space.S200,
        width: 'fit-content',
        maxWidth: `min(${toRem(600)}, 100%)`,
      }}
    >
      <Box alignItems="Center" gap="100" grow="Yes">
        {threadTopic ? (
          <Text size="T200" truncate>
            {threadTopic}
          </Text>
        ) : threadLastReplySenderId ? (
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
              {threadLastReplySenderName}: {threadSummary}
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
