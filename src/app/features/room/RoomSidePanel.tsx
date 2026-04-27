import React, {
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Badge,
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  config,
  toRem,
} from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import * as css from './RoomSidePanel.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { TypingIndicator } from '../../components/typing-indicator';
import { getLatestMessageText, getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useMemberSort, useMemberSortMenu } from '../../hooks/useMemberSort';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { MemberSortMenu } from '../../components/MemberSortMenu';
import { useOpenUserRoomProfile, useUserRoomProfileState } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useGetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { MemberPowerTag } from '../../../types/matrix/room';
import { MembershipFilter } from '../../hooks/useMemberFilter';
import { BADGE_LABEL_KEYS } from '../../hooks/usePowerLevelTags';
import { useThreadChat } from '../../state/threadChat';
import { useRoomThreads } from '../../hooks/useRoomThreads';
import { Avatar } from '../../components/avatar';

type MemberItemProps = {
  mx: MatrixClient;
  useAuthentication: boolean;
  room: Room;
  member: RoomMember;
  powerTag?: MemberPowerTag;
  onClick: MouseEventHandler<HTMLButtonElement>;
  pressed?: boolean;
  typing?: boolean;
};
function MemberItem({
  mx,
  useAuthentication,
  room,
  member,
  powerTag,
  onClick,
  pressed,
  typing,
}: MemberItemProps) {
  const { t } = useTranslation();
  const name =
    getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;
  const avatarMxcUrl = member.getMxcAvatarUrl();
  const avatarUrl = avatarMxcUrl
    ? mx.mxcUrlToHttp(avatarMxcUrl, 100, 100, 'crop', undefined, false, useAuthentication)
    : undefined;

  const badge = powerTag
    ? (() => {
        const labelKey = BADGE_LABEL_KEYS[powerTag.name];
        if (!labelKey) return undefined;
        const variant = powerTag.name === 'Admin' || powerTag.name === 'Creator' || powerTag.name === 'Owner' ? 'Primary' as const : 'Success' as const;
        return { label: t(labelKey), variant };
      })()
    : undefined;

  return (
    <MenuItem
      style={{ padding: `0 ${config.space.S200}` }}
      aria-pressed={pressed}
      data-user-id={member.userId}
      variant="Background"
      size="300"
      radii="400"
      onClick={onClick}
      before={
        <Avatar size="200" radii="Pill">
          <UserAvatar
            userId={member.userId}
            src={avatarUrl ?? undefined}
            alt={name}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      }
      after={
        <Box alignItems="Center" gap="100" shrink="No">
          {badge && (
            <Badge
              variant={badge.variant}
              fill="Soft"
              radii="300"
              outlined
            >
              <Text size="T200">{badge.label}</Text>
            </Badge>
          )}
          {typing && (
            <Badge size="300" variant="Secondary" fill="Soft" radii="Pill" outlined>
              <TypingIndicator size="300" />
            </Badge>
          )}
        </Box>
      }
    >
      <Box grow="Yes">
        <Text size="T300" truncate>
          {name}
        </Text>
      </Box>
    </MenuItem>
  );
}

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

const mxIdToName = (mxId: string) => getMxIdLocalPart(mxId) ?? mxId;
const getRoomMemberStr: SearchItemStrGetter<RoomMember> = (m, query) =>
  getMemberSearchStr(m, query, mxIdToName);

type RoomSidePanelProps = {
  room: Room;
  members: RoomMember[];
};
export function RoomSidePanel({ room, members }: RoomSidePanelProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const getPowerTag = useGetMemberPowerTag(room, creators, powerLevels);

  const fetchingMembers = members.length < room.getJoinedMemberCount();
  const openUserRoomProfile = useOpenUserRoomProfile();
  const space = useSpaceOptionally();
  const openProfileUserId = useUserRoomProfileState()?.userId;

  const sortFilterMenu = useMemberSortMenu();
  const [sortFilterIndex, setSortFilterIndex] = useSetting(settingsAtom, 'memberSortFilterIndex');
  const memberSort = useMemberSort(sortFilterIndex, sortFilterMenu);
  const [, setThreadChat] = useThreadChat(room.roomId);

  const typingMembers = useRoomTypingMember(room.roomId);
  const isSpaceRoom = room.isSpaceRoom();
  const {
    threads,
    loading: loadingThreads,
    error: loadingThreadsError,
    retry: retryLoadThreads,
  } = useRoomThreads(room);

  const filteredMembers = useMemo(
    () => members.filter(MembershipFilter.filterJoined).sort(memberSort.sortFn),
    [members, memberSort]
  );

  const [result, search] = useAsyncSearch(
    filteredMembers,
    getRoomMemberStr,
    SEARCH_OPTIONS
  );
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

  const processMembers = result ? result.items : filteredMembers;

  const virtualizer = useVirtualizer({
    count: processMembers.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 32,
    overscan: 10,
    gap: 4
  });

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    if (!userId) return;
    openUserRoomProfile(room.roomId, space?.roomId, userId, btn.getBoundingClientRect(), 'Left');
  };

  const handleThreadClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (evt) => {
      const rootId = evt.currentTarget.getAttribute('data-event-id');
      if (!rootId) return;

      setThreadChat({ open: true, threadRootId: rootId });
    },
    [setThreadChat]
  );

  const sortedThreads = useMemo(() => {
    if (isSpaceRoom) return [];

    return [...threads].sort((a, b) => {
      const aTs = a.replyToEvent?.getTs() ?? a.rootEvent?.getTs() ?? 0;
      const bTs = b.replyToEvent?.getTs() ?? b.rootEvent?.getTs() ?? 0;
      return bTs - aTs;
    });
  }, [threads, isSpaceRoom]);

  const formatRelativeTime = useCallback((ts: number) => dayjs(ts).fromNow(), []);

  return (
    <Box
      className={classNames(css.RoomSidePanel, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      direction="Column"
    >
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
          <Box className={css.MemberDrawerContent} direction="Column" gap="600">
            <Box direction="Column" gap="100">
              <Box className={css.MembersGroupLabelWithFilter} ref={scrollTopAnchorRef} alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text size="L400" priority="300">
                  {`${t('common.members')} (${processMembers.length})`}
                </Text>

                <UseStateProvider initial={undefined}>
                  {(anchor: RectCords | undefined, setAnchor) => (
                    <PopOut
                      anchor={anchor}
                      position="Bottom"
                      align="End"
                      offset={4}
                      content={
                        <MemberSortMenu
                          selected={sortFilterIndex}
                          onSelect={setSortFilterIndex}
                          requestClose={() => setAnchor(undefined)}
                        />
                      }
                    >
                      <Chip
                        onClick={
                          ((evt) =>
                            setAnchor(
                              evt.currentTarget.getBoundingClientRect()
                            )) as MouseEventHandler<HTMLButtonElement>
                        }
                        variant="Background"
                        size="400"
                        radii="300"
                        after={<Icon src={Icons.Sort} size="50" />}
                      >
                        <Text size="T200">{memberSort.name}</Text>
                      </Chip>
                    </PopOut>
                  )}
                </UseStateProvider>
              </Box>

              <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
                <IconButton
                  onClick={() => virtualizer.scrollToOffset(0)}
                  variant="Surface"
                  radii="Pill"
                  outlined
                  size="300"
                  aria-label={t('common.scrollToTop')}
                >
                  <Icon src={Icons.ChevronTop} size="300" />
                </IconButton>
              </ScrollTopContainer>

              {!fetchingMembers && !result && processMembers.length === 0 && (
                <Text style={{ padding: config.space.S300 }} align="Center">
                  {t('room.noMembersOfType', { type: t('common.members') })}
                </Text>
              )}

              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const member = processMembers[vItem.index];
                  const powerTag = getPowerTag(member.userId);

                  return (
                    <div
                      style={{
                        transform: `translateY(${vItem.start}px)`,
                      }}
                      className={css.DrawerVirtualItem}
                      data-index={vItem.index}
                      key={`${room.roomId}-${member.userId}`}
                      ref={virtualizer.measureElement}
                    >
                      <MemberItem
                        mx={mx}
                        useAuthentication={useAuthentication}
                        room={room}
                        member={member}
                        powerTag={powerTag}
                        onClick={handleMemberClick}
                        pressed={openProfileUserId === member.userId}
                        typing={typingMembers.some(
                          (receipt) => receipt.userId === member.userId
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </Box>

            {fetchingMembers && (
              <Box justifyContent="Center">
                <Spinner />
              </Box>
            )}

            {!isSpaceRoom && (
              <Box direction="Column" gap="100">
                <Text className={css.MembersGroupLabel} size="L400" priority="300">
                  {t('room.threads')}
                </Text>

                {loadingThreads && (
                  <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
                    <Spinner />
                  </Box>
                )}

                {!loadingThreads && loadingThreadsError && (
                  <Box direction="Column" alignItems="Center" gap="100" style={{ padding: config.space.S300 }}>
                    <Text align="Center" size="T300" priority="300">
                      {t('room.threadsLoadFailed')}
                    </Text>
                    <Chip as="button" variant="SurfaceVariant" size="400" radii="300" onClick={retryLoadThreads}>
                      <Text size="T200">{t('common.retry')}</Text>
                    </Chip>
                  </Box>
                )}

                {!loadingThreads && !loadingThreadsError && sortedThreads.length === 0 && (
                  <Text style={{ padding: config.space.S300 }} align="Center" size="T300" priority="300">
                    {t('room.noThreads')}
                  </Text>
                )}

                {!loadingThreads && !loadingThreadsError && sortedThreads.length > 0 && (
                  <Box direction="Column" gap="100">
                    {sortedThreads.map((thread) => {
                      const rootSummary = thread.rootEvent
                        ? getLatestMessageText(room, thread.rootEvent, mx.getSafeUserId(), false, t)
                        : undefined;
                      const latestReplyEvent = thread.replyToEvent;
                      const latestReplySummary = latestReplyEvent
                        ? getLatestMessageText(room, latestReplyEvent, mx.getSafeUserId(), false, t)
                        : undefined;
                      const threadReplies = Math.max(thread.length ?? 0, 0);
                      const latestReplySenderId = latestReplyEvent?.getSender();
                      const latestReplySenderName = latestReplySenderId
                        ? getMemberDisplayName(room, latestReplySenderId) ??
                          getMxIdLocalPart(latestReplySenderId) ??
                          latestReplySenderId
                        : undefined;
                      const latestReplyAvatarMxcUrl = latestReplySenderId
                        ? room.getMember(latestReplySenderId)?.getMxcAvatarUrl()
                        : undefined;
                      const latestReplyAvatarUrl = latestReplyAvatarMxcUrl
                        ? mx.mxcUrlToHttp(
                            latestReplyAvatarMxcUrl,
                            64,
                            64,
                            'crop',
                            undefined,
                            false,
                            useAuthentication
                          )
                        : undefined;
                      const latestTs = latestReplyEvent?.getTs() ?? thread.rootEvent?.getTs();

                      return (
                        <MenuItem
                          key={thread.id}
                          data-event-id={thread.id}
                          style={{ padding: `0 ${config.space.S200}`, height: toRem(52) }}
                          variant="Background"
                          radii="400"
                          onClick={handleThreadClick}
                          after={
                            latestTs ? (
                              <Text size="T200" priority="300" style={{ flexShrink: 0}}>
                                {formatRelativeTime(latestTs)}
                              </Text>
                            ) : undefined
                          }
                        >
                          <Box grow="Yes" direction="Column" gap="100">
                            <Text size="T300" truncate>
                              {rootSummary ?? t('message.threadLatestReplyFallback')}
                            </Text>
                            {threadReplies > 0 && latestReplySenderId ? (
                              <Box alignItems="Center" gap="100">
                                <Avatar size="100" radii="Pill">
                                  <UserAvatar
                                    userId={latestReplySenderId}
                                    src={latestReplyAvatarUrl ?? undefined}
                                    alt={latestReplySenderName ?? latestReplySenderId}
                                    renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                                  />
                                </Avatar>
                                <Text size="T200" priority="300" truncate>
                                  {latestReplySummary ?? t('message.threadLatestReplyFallback')}
                                </Text>
                              </Box>
                            ) : (
                              <Text size="T200" priority="300" truncate>
                                {t('message.threadNoReplies')}
                              </Text>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}

          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
