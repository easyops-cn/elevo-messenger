import { Box, Icon, Icons, Line, Text, as, color, toRem } from 'folds';
import { EventTimelineSet, Room } from 'matrix-js-sdk';
import React, { MouseEventHandler, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { getMemberDisplayName, trimReplyFromBody } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { LinePlaceholder } from './placeholder';
import { randomNumberBetween } from '../../utils/common';
import * as css from './Reply.css';
import { MessageBadEncryptedContent, MessageDeletedContent, MessageFailedContent } from './content';
import { scaleSystemEmoji } from '../../plugins/react-custom-html-parser';
import { useRoomEvent } from '../../hooks/useRoomEvent';
import { GetMemberPowerTag } from '../../hooks/useMemberPowerTag';

type ReplyLayoutProps = {
  username?: string;
};
export const ReplyLayout = as<'div', ReplyLayoutProps>(
  ({ username, className, children, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <Box
        className={classNames(css.Reply, className)}
        alignItems="Center"
        gap="100"
        {...props}
        ref={ref}
      >
        <Box style={{ maxWidth: toRem(200) }} alignItems="Center" shrink="No">
          <Text as="span" size="T300">
            {`${t('common.reply')} ${username ?? ''}:`}
          </Text>
        </Box>
        <Box grow="Yes">
          {children}
        </Box>
      </Box>
    );
  }
);

export const ThreadIndicator = as<'div'>(({ ...props }, ref) => (
  <Box
    shrink="No"
    className={css.ThreadIndicator}
    alignItems="Center"
    gap="100"
    {...props}
    ref={ref}
  >
    <Icon size="50" src={Icons.Thread} />
    <Text size="L400">Thread</Text>
  </Box>
));

type ReplyProps = {
  room: Room;
  timelineSet?: EventTimelineSet | undefined;
  replyEventId: string;
  threadRootId?: string | undefined;
  onClick?: MouseEventHandler | undefined;
  getMemberPowerTag?: GetMemberPowerTag;
  accessibleTagColors?: Map<string, string>;
  legacyUsernameColor?: boolean;
};

export const Reply = as<'div', ReplyProps>(
  (
    {
      room,
      timelineSet,
      replyEventId,
      threadRootId,
      onClick,
      ...props
    },
    ref
  ) => {
    const placeholderWidth = useMemo(() => randomNumberBetween(40, 400), []);
    const getFromLocalTimeline = useCallback(
      () => timelineSet?.findEventById(replyEventId),
      [timelineSet, replyEventId]
    );
    const replyEvent = useRoomEvent(room, replyEventId, getFromLocalTimeline);

    const { body } = replyEvent?.getContent() ?? {};
    const sender = replyEvent?.getSender();

    const fallbackBody = replyEvent?.isRedacted() ? (
      <MessageDeletedContent />
    ) : (
      <MessageFailedContent />
    );

    const badEncryption = replyEvent?.getContent().msgtype === 'm.bad.encrypted';
    const bodyJSX = body ? scaleSystemEmoji(trimReplyFromBody(body)) : fallbackBody;

    return (
      <Box direction="Row" gap="200" alignItems="Center" {...props} ref={ref}>
        <Line size="500" variant="Primary" direction="Vertical" style={{ height: toRem(14) }} />
        {threadRootId && (
          <ThreadIndicator as="button" data-event-id={threadRootId} onClick={onClick} />
        )}
        <ReplyLayout
          as="button"
          username={sender ? (getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender)) : undefined}
          data-event-id={replyEventId}
          onClick={onClick}
        >
          {replyEvent !== undefined ? (
            <Text size="T300" truncate>
              {badEncryption ? <MessageBadEncryptedContent /> : bodyJSX}
            </Text>
          ) : (
            <LinePlaceholder
              style={{
                backgroundColor: color.SurfaceVariant.ContainerActive,
                width: toRem(placeholderWidth),
                maxWidth: '100%',
              }}
            />
          )}
        </ReplyLayout>
      </Box>
    );
  }
);
