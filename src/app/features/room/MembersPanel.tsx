import React, { MouseEventHandler, useCallback, useMemo, useRef } from 'react';
import {
  Badge,
  Box,
  Chip,
  Icon,
  Icons,
  MenuItem,
  Spinner,
  Text,
  config,
} from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as css from './RoomSidePanel.css';
import {
  SearchItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../hooks/useAsyncSearch';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName, getMemberSearchStr } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { UserAvatar } from '../../components/user-avatar';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { MemberSort } from '../../hooks/useMemberSort';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import {
  useOpenUserRoomProfile,
  useUserRoomProfileState,
} from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useGetMemberPowerTag } from '../../hooks/useMemberPowerTag';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { MemberPowerTag } from '../../../types/matrix/room';
import { MembershipFilter } from '../../hooks/useMemberFilter';
import { BADGE_LABEL_KEYS } from '../../hooks/usePowerLevelTags';
import { Avatar } from '../../components/avatar';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { RoomSettingsPage } from '../../state/roomSettings';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

type MemberItemProps = {
  useAuthentication: boolean;
  room: Room;
  member: RoomMember;
  powerTag?: MemberPowerTag;
  onClick: MouseEventHandler<HTMLButtonElement>;
  pressed?: boolean;
  typing?: boolean;
};

function MemberItem({
  useAuthentication,
  room,
  member,
  powerTag,
  onClick,
  pressed,
  typing,
}: MemberItemProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
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
        const variant =
          powerTag.name === 'Admin' || powerTag.name === 'Creator' || powerTag.name === 'Owner'
            ? ('Primary' as const)
            : ('Success' as const);
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
            <Badge variant={badge.variant} fill="Soft" radii="300" outlined>
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

type MembersPanelProps = {
  room: Room;
};

export function MembersPanel({
  room,
}: MembersPanelProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, room.roomId);
  const useAuthentication = useMediaAuthentication();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const getPowerTag = useGetMemberPowerTag(room, creators, powerLevels);

  const fetchingMembers = members.length < room.getJoinedMemberCount();
  const openUserRoomProfile = useOpenUserRoomProfile();
  const openRoomSettings = useOpenRoomSettings();
  const space = useSpaceOptionally();
  const openProfileUserId = useUserRoomProfileState()?.userId;

  const typingMembers = useRoomTypingMember(room.roomId);

  const filteredMembers = useMemo(
    () => members.filter(MembershipFilter.filterJoined).sort(MemberSort.Oldest),
    [members]
  );

  const [result, search] = useAsyncSearch(filteredMembers, getRoomMemberStr, SEARCH_OPTIONS);
  if (!result && searchInputRef.current?.value) search(searchInputRef.current.value);

  const processMembers = result ? result.items : filteredMembers;
  const shouldShowMembersPreview = !result && processMembers.length > MEMBER_PREVIEW_THRESHOLD;
  const displayMembers = shouldShowMembersPreview
    ? processMembers.slice(0, MEMBER_PREVIEW_THRESHOLD - 1)
    : processMembers;

  const handleMemberClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const btn = evt.currentTarget as HTMLButtonElement;
    const userId = btn.getAttribute('data-user-id');
    if (!userId) return;
    openUserRoomProfile(room.roomId, space?.roomId, userId, btn.getBoundingClientRect(), 'Left');
  };

  const handleViewAllMembers: MouseEventHandler<HTMLButtonElement> = useCallback(() => {
    openRoomSettings(room.roomId, space?.roomId, RoomSettingsPage.MembersPage);
  }, [openRoomSettings, room.roomId, space?.roomId]);

  return (
    <Box direction="Column" gap="100">
      <Box
        className={css.MembersGroupLabel}
        alignItems="Center"
        justifyContent="SpaceBetween"
        gap="200"
      >
        <Text size="L400" priority="300">
          {t('common.members')}
        </Text>
      </Box>

      {!fetchingMembers && !result && processMembers.length === 0 && (
        <Text style={{ padding: config.space.S300 }} align="Center">
          {t('room.noMembersOfType', { type: t('common.members') })}
        </Text>
      )}

      <Box direction="Column" gap="100">
        {displayMembers.map((member) => {
          const powerTag = getPowerTag(member.userId);

          return (
            <div key={`${room.roomId}-${member.userId}`}>
              <MemberItem
                useAuthentication={useAuthentication}
                room={room}
                member={member}
                powerTag={powerTag}
                onClick={handleMemberClick}
                pressed={openProfileUserId === member.userId}
                typing={typingMembers.some((receipt) => receipt.userId === member.userId)}
              />
            </div>
          );
        })}
      </Box>

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

      {fetchingMembers && (
        <Box justifyContent="Center">
          <Spinner />
        </Box>
      )}
    </Box>
  );
}
