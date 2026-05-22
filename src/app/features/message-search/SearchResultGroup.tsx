/* eslint-disable react/destructuring-assignment */
import React, { MouseEventHandler, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { JoinRule, Room, type MatrixEvent } from 'matrix-js-sdk';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Box, Chip, Header, Icon, Icons, Text, config } from 'folds';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlParser,
  LINKIFY_OPTS,
  makeHighlightRegex,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { useMatrixEventRenderer } from '../../hooks/useMatrixEventRenderer';
import { GetContentCallback, MessageEvent } from '../../../types/matrix/room';
import {
  AvatarBase,
  ModernLayout,
  RedactedContent,
  Reply,
  Time,
  Username,
  UsernameBold,
} from '../../components/message';
import { RenderMessageContent } from '../../components/RenderMessageContent';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getMemberAvatarMxc, getMemberDisplayName, getRoomAvatarUrl } from '../../utils/room';
import { ResultItem } from './useMessageSearch';
import { SequenceCard } from '../../components/sequence-card';
import { UserAvatar } from '../../components/user-avatar';
import { useMentionClickHandler } from '../../hooks/useMentionClickHandler';
import { useSpoilerClickHandler } from '../../hooks/useSpoilerClickHandler';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { Avatar } from '../../components/avatar';

type SearchResultGroupProps = {
  room: Room;
  highlights: string[];
  items: ResultItem[];
  urlPreview?: boolean;
  onOpen: (roomId: string, eventId: string) => void;
  hour24Clock: boolean;
  dateFormatString: string;
};
export function SearchResultGroup({
  room,
  highlights,
  items,
  urlPreview,
  onOpen,
  hour24Clock,
  dateFormatString,
}: SearchResultGroupProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const highlightRegex = useMemo(() => makeHighlightRegex(highlights), [highlights]);

  const mentionClickHandler = useMentionClickHandler(room.roomId);
  const spoilerClickHandler = useSpoilerClickHandler();

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(mx, room.roomId, href, makeMentionCustomProps(mentionClickHandler))
      ),
    }),
    [mx, room, mentionClickHandler]
  );
  const htmlReactParserOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlParser(mx, room.roomId, {
        linkifyOpts,
        highlightRegex,
        useAuthentication,
        handleSpoilerClick: spoilerClickHandler,
        handleMentionClick: mentionClickHandler,
      }),
    [
      mx,
      room,
      linkifyOpts,
      highlightRegex,
      mentionClickHandler,
      spoilerClickHandler,
      useAuthentication,
    ]
  );

  const renderMatrixEvent = useMatrixEventRenderer<[MatrixEvent, string, GetContentCallback]>(
    {
      [MessageEvent.RoomMessage]: (event, displayName, getContent) => {
        if (event.isRedacted()) {
          return <RedactedContent reason={event.getUnsigned().redacted_because?.content.reason} />;
        }

        return (
          <RenderMessageContent
            displayName={displayName}
            msgType={event.getContent().msgtype ?? ''}
            ts={event.getTs()}
            eventId={event.getId()!}
            getContent={getContent}
            urlPreview={urlPreview}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
            highlightRegex={highlightRegex}
            outlineAttachment
          />
        );
      },
    },
  );

  const handleOpenClick: MouseEventHandler = (evt) => {
    const eventId = evt.currentTarget.getAttribute('data-event-id');
    if (!eventId) return;
    onOpen(room.roomId, eventId);
  };

  return (
    <Box direction="Column" gap="200">
      <Header size="300">
        <Box gap="200" grow="Yes">
          <Avatar size="200" radii="Pill">
            <RoomAvatar
              roomId={room.roomId}
              src={getRoomAvatarUrl(mx, room, 96, useAuthentication)}
              alt={room.name}
              renderFallback={() => (
                <RoomIcon
                  size="50"
                  roomType={room.getType()}
                  joinRule={room.getJoinRule() ?? JoinRule.Restricted}
                  filled
                />
              )}
            />
          </Avatar>
          <Text size="H4" truncate>
            {room.name}
          </Text>
        </Box>
      </Header>
      <Box direction="Column" gap="100">
        {items.map((item) => {
          const { event: mEvent } = item;

          const eventId = mEvent.getId()!;
          const senderUserId = mEvent.sender!.userId;
          const displayName =
            getMemberDisplayName(room, senderUserId) ??
            getMxIdLocalPart(senderUserId) ??
            senderUserId;
          const senderAvatarMxc = getMemberAvatarMxc(room, senderUserId);
          const getContent = (() => mEvent.getContent()) as GetContentCallback;
          const mainEventId = mEvent.getId();
          const { replyEventId } = mEvent;

          return (
            <SequenceCard
              key={eventId}
              style={{ padding: config.space.S400 }}
              variant="SurfaceVariant"
              direction="Column"
            >
              <ModernLayout
                inTimeline={false}
                before={
                  <AvatarBase>
                    <Avatar size="300" radii="Pill">
                      <UserAvatar
                        userId={senderUserId}
                        src={
                          senderAvatarMxc
                            ? mxcUrlToHttp(
                                mx,
                                senderAvatarMxc,
                                useAuthentication,
                                48,
                                48,
                                'crop'
                              ) ?? undefined
                            : undefined
                        }
                        alt={displayName}
                        renderFallback={() => <Icon size="200" src={Icons.User} filled />}
                      />
                    </Avatar>
                  </AvatarBase>
                }
              >
                <Box gap="300" justifyContent="SpaceBetween" alignItems="Center" grow="Yes">
                  <Box gap="200" alignItems="Baseline">
                    <Box alignItems="Center" gap="200">
                      <Username>
                        <Text as="span" truncate>
                          <UsernameBold>{displayName}</UsernameBold>
                        </Text>
                      </Username>
                    </Box>
                    <Time
                      ts={mEvent.getTs()}
                      hour24Clock={hour24Clock}
                      dateFormatString={dateFormatString}
                    />
                  </Box>
                  <Box shrink="No" gap="200" alignItems="Center">
                    <Chip
                      data-event-id={mainEventId}
                      onClick={handleOpenClick}
                      variant="Secondary"
                      radii="400"
                    >
                      <Text size="T200">{t('search.open')}</Text>
                    </Chip>
                  </Box>
                </Box>
                {replyEventId && mainEventId && (
                  <Reply
                    room={room}
                    eventId={mainEventId}
                    replyEventId={replyEventId}
                    onClick={handleOpenClick}
                  />
                )}
                {renderMatrixEvent(mEvent.getType(), false, mEvent, displayName, getContent)}
              </ModernLayout>
            </SequenceCard>
          );
        })}
      </Box>
    </Box>
  );
}
