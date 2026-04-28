import React, {
  MouseEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Badge,
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Scroll,
  Spinner,
  Text,
  config,
} from 'folds';
import { MatrixClient, Room, RoomMember, MatrixEvent } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

import * as css from './RoomSidePanel.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { MemberSort } from '../../hooks/useMemberSort';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
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
import { useRoomFiles } from '../../hooks/useRoomFiles';
import { Avatar } from '../../components/avatar';
import { ThreadMenuItem } from './ThreadMenuItem';
import { FileMenuItem } from './FileMenuItem';
import { FileViewerOverlay } from './FileViewerOverlay';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { RoomSettingsPage } from '../../state/roomSettings';

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

const MEMBER_PREVIEW_THRESHOLD = 10;
const MEMBER_PREVIEW_COUNT = 9;

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
  const openRoomSettings = useOpenRoomSettings();
  const space = useSpaceOptionally();
  const openProfileUserId = useUserRoomProfileState()?.userId;
  const [, setThreadChat] = useThreadChat(room.roomId);

  const [viewingFile, setViewingFile] = useState<MatrixEvent | null>(null);

  const typingMembers = useRoomTypingMember(room.roomId);
  const isSpaceRoom = room.isSpaceRoom();
  const {
    threads,
    loading: loadingThreads,
    error: loadingThreadsError,
    retry: retryLoadThreads,
  } = useRoomThreads(room);

  const {
    files,
    loading: loadingFiles,
    error: loadingFilesError,
    retry: retryLoadFiles,
  } = useRoomFiles(room);

  const filteredMembers = useMemo(
    () => members.filter(MembershipFilter.filterJoined).sort(MemberSort.Oldest),
    [members]
  );

  const [result, search] = useAsyncSearch(
    filteredMembers,
    getRoomMemberStr,
    SEARCH_OPTIONS
  );
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

  const processMembers = result ? result.items : filteredMembers;
  const shouldShowMembersPreview = !result && processMembers.length > MEMBER_PREVIEW_THRESHOLD;
  const displayMembers = shouldShowMembersPreview
    ? processMembers.slice(0, MEMBER_PREVIEW_COUNT)
    : processMembers;

  const virtualizer = useVirtualizer({
    count: displayMembers.length,
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

  const handleViewAllMembers: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    openRoomSettings(room.roomId, space?.roomId, RoomSettingsPage.MembersPage);
  }, [openRoomSettings, room.roomId, space?.roomId]);

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
              <Box className={css.MembersGroupLabel} ref={scrollTopAnchorRef} alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text size="L400" priority="300">
                  {t('common.members')}
                </Text>
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
                  const member = displayMembers[vItem.index];
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

              {shouldShowMembersPreview && (
                <Box justifyContent="Center">
                  <Chip
                    as="button"
                    variant="SurfaceVariant"
                    fill="None"
                    size="500"
                    radii="300"
                    onClick={handleViewAllMembers}
                  >
                    <Text size="T200">{`${t('room.viewAllMembers')} (${processMembers.length})`}</Text>
                  </Chip>
                </Box>
              )}
            </Box>

            {fetchingMembers && (
              <Box justifyContent="Center">
                <Spinner />
              </Box>
            )}

            {!isSpaceRoom && (
              <Box direction="Column" gap="100">
                <Text className={css.MembersGroupLabel} size="L400" priority="300">
                  {t('room.files')}
                </Text>

                {loadingFiles && (
                  <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
                    <Spinner />
                  </Box>
                )}

                {!loadingFiles && loadingFilesError && (
                  <Box direction="Column" alignItems="Center" gap="100" style={{ padding: config.space.S300 }}>
                    <Text align="Center" size="T300" priority="300">
                      {t('room.filesLoadFailed')}
                    </Text>
                    <Chip as="button" variant="SurfaceVariant" size="400" radii="300" onClick={retryLoadFiles}>
                      <Text size="T200">{t('common.retry')}</Text>
                    </Chip>
                  </Box>
                )}

                {!loadingFiles && !loadingFilesError && files.length === 0 && (
                  <Text style={{ padding: config.space.S300 }} align="Center" size="T200" priority="300">
                    {t('room.noFiles')}
                  </Text>
                )}

                {!loadingFiles && !loadingFilesError && files.length > 0 && (
                  <Box direction="Column" gap="100">
                    {files.map((fileEvent) => (
                      <FileMenuItem
                        key={fileEvent.getId()}
                        fileEvent={fileEvent}
                        onClick={() => setViewingFile(fileEvent)}
                      />
                    ))}
                  </Box>
                )}
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
                  <Text style={{ padding: config.space.S300 }} align="Center" size="T200" priority="300">
                    {t('room.noThreads')}
                  </Text>
                )}

                {!loadingThreads && !loadingThreadsError && sortedThreads.length > 0 && (
                  <Box direction="Column" gap="100">
                    {sortedThreads.map((thread) => (
                      <ThreadMenuItem
                        key={thread.id}
                        useAuthentication={useAuthentication}
                        room={room}
                        thread={thread}
                        onClick={handleThreadClick}
                        formatRelativeTime={formatRelativeTime}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            )}

          </Box>
        </Scroll>
      </Box>

      {viewingFile && <FileViewerOverlay
        fileEvent={viewingFile}
        requestClose={() => setViewingFile(null)}
      />}
    </Box>
  );
}
