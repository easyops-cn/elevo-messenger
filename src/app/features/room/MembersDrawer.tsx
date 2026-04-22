import React, {
  MouseEventHandler,
  useMemo,
  useRef,
} from 'react';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Spinner,
  Text,
  Tooltip,
  TooltipProvider,
  config,
} from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';
import { useVirtualizer } from '@tanstack/react-virtual';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import * as css from './MembersDrawer.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UseStateProvider } from '../../components/UseStateProvider';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useSetSetting, useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { millify } from '../../plugins/millify';
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

type MemberDrawerHeaderProps = {
  room: Room;
};
function MemberDrawerHeader({ room }: MemberDrawerHeaderProps) {
  const { t } = useTranslation();
  const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

  return (
    <Header className={css.MembersDrawerHeader} variant="Background" size="600">
      <Box grow="Yes" alignItems="Center" gap="200">
        <Box grow="Yes" alignItems="Center" gap="200">
          <Text
            title={t('room.membersCount', { count: room.getJoinedMemberCount() })}
            size="H5"
            truncate
          >
            {t('room.membersCount', { count: millify(room.getJoinedMemberCount()) })}
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
              <IconButton
                size="300"
                ref={triggerRef}
                variant="Background"
                onClick={() => setPeopleDrawer(false)}
              >
                <Icon src={Icons.Cross} />
              </IconButton>
            )}
          </TooltipProvider>
        </Box>
      </Box>
    </Header>
  );
}

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
        <Text size="T400" truncate>
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

type MembersDrawerProps = {
  room: Room;
  members: RoomMember[];
};
export function MembersDrawer({ room, members }: MembersDrawerProps) {
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

  const typingMembers = useRoomTypingMember(room.roomId);

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
    estimateSize: () => 40,
    overscan: 10,
  });

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    if (!userId) return;
    openUserRoomProfile(room.roomId, space?.roomId, userId, btn.getBoundingClientRect(), 'Left');
  };

  return (
    <Box
      className={classNames(css.MembersDrawer, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      direction="Column"
    >
      <MemberDrawerHeader room={room} />
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
          <Box className={css.MemberDrawerContent} direction="Column" gap="200">
            <Box ref={scrollTopAnchorRef} direction="Column" gap="200">
              <Box alignItems="Center" justifyContent="End" gap="200">
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
                {t('room.noMembers')}
              </Text>
            )}

            <Box direction="Column" gap="100">
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
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
