import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Icon,
  Icons,
  Line,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue, useSetAtom } from 'jotai';
import { RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { sortRoomIdsByActivity } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
} from '../../../components/nav';
import { getHomeCreatePath, getHomeCreateChatPath, getHomeInvitesPath, getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId, getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeCreateChatSelected,
  useHomeInvitesSelected,
} from '../../../hooks/router/useHomeSelected';
import { useAllHomeRooms } from './useAllHomeRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { UnreadBadge } from '../../../components/unread-badge';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { mDirectAtom } from '../../../state/mDirectList';
import { searchModalAtom } from '../../../state/searchModal';
import { HashIcon } from '../../../icons/HashIcon';
import { PlusIcon } from '../../../icons/PlusIcon';
import { SearchIcon } from '../../../icons/SearchIcon';
import { MailIcon } from '../../../icons/MailIcon';
import { UserAvatar } from '../../../components/user-avatar';
import { nameInitials } from '../../../utils/common';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { Avatar } from '../../../components/avatar';
import { isMacOS } from '../../../utils/user-agent';
import { KeySymbol } from '../../../utils/key-symbol';
import * as css from './Home.css';
import { elevoColor } from '../../../../config.css';

function HomeHeader() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const userId = mx.getSafeUserId();
  const profile = useUserProfile(userId);
  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  return (
    <PageNavHeader style={{ height: toRem(50) }}>
      <Box alignItems="Center" grow="Yes" gap="300" style={{ paddingLeft: config.space.S200 }}>
        <Avatar size="250" radii="Pill">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            renderFallback={() => <Text size="H6">{nameInitials(displayName)}</Text>}
          />
        </Avatar>
        <Box grow="Yes">
          <Text size="B400" truncate>
            {displayName}
          </Text>
        </Box>
      </Box>
    </PageNavHeader>
  );
}

function HomeEmpty() {
  const { t } = useTranslation();
  
  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={HashIcon} />}
        title={
          <Text size="H5" align="Center">
            {t('home.noRooms')}
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            {t('home.noRoomsDesc')}
          </Text>
        }
      />
    </NavEmptyCenter>
  );
}

export function Home() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  useNavToActivePathMapper('home');
  const scrollRef = useRef<HTMLDivElement>(null);

  const rooms = useAllHomeRooms();

  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const navigate = useNavigate();

  const selectedRoomId = useSelectedRoom();
  const createRoomSelected = useHomeCreateSelected();
  const createChatSelected = useHomeCreateChatSelected();
  const invitesSelected = useHomeInvitesSelected();
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;
  const setSearchOpen = useSetAtom(searchModalAtom);
  const modifierKey = isMacOS() ? KeySymbol.Command : 'ctrl';
  const noRoomToDisplay = rooms.length === 0;
  const [tick, setTick] = useState(0);
  const bumpTick = useCallback(() => setTick((v) => v + 1), []);
  const roomIdSet = useMemo(() => new Set(rooms), [rooms]);

  useEffect(() => {
    const handleTimelineEvent: RoomEventHandlerMap[RoomEvent.Timeline] = (
      _mEvent,
      room,
      _toStartOfTimeline,
      removed,
      data
    ) => {
      if (!room || !data.liveEvent || removed || !roomIdSet.has(room.roomId)) return;
      bumpTick();
    };

    mx.on(RoomEvent.Timeline, handleTimelineEvent);
    return () => {
      mx.removeListener(RoomEvent.Timeline, handleTimelineEvent);
    };
  }, [mx, roomIdSet, bumpTick]);

  const sortedRooms = useMemo(
    () => sortRoomIdsByActivity(rooms, (id) => mx.getRoom(id) ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mx, rooms, tick]
  );

  const virtualizer = useVirtualizer({
    count: sortedRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 49,
    overscan: 10,
    gap: 4,
  });

  return (
    <PageNav stretch>
      <HomeHeader />
      <PageNavContent scrollRef={scrollRef}>
        <Box direction="Column" gap="300">
          <Button
            onClick={() => setSearchOpen(true)}
            size="300"
            variant="Secondary"
            radii="Pill"
            fill="Soft"
            before={<Icon size="200" src={SearchIcon} style={{ opacity: config.opacity.Placeholder }} />}
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              height: toRem(28),
              padding: `0 ${config.space.S300}`,
              fontSize: toRem(13),
              backgroundColor: elevoColor.Background.SearchBar,
            }}
          >
            <Box as="span" grow="Yes" alignItems="Center" justifyContent="SpaceBetween" gap="100" style={{ opacity: config.opacity.Placeholder }}>
              <Text size="T300" truncate>
                {t('home.search')}
              </Text>
              <span className={css.searchShortcutHint}>
                {`${modifierKey} + K`}
              </span>
            </Box>
          </Button>
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={createRoomSelected}>
              <NavButton onClick={() => navigate(getHomeCreatePath())}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={PlusIcon} size="200" style={{ color: color.Primary.Main }} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('home.createRoom')}
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavButton>
            </NavItem>
            <NavItem variant="Background" radii="400" aria-selected={createChatSelected}>
              <NavButton onClick={() => navigate(getHomeCreateChatPath())}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Message} size="200" style={{ color: color.Primary.Main }} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('direct.createChat')}
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavButton>
            </NavItem>
            {inviteCount > 0 && (
              <NavItem variant="Background" radii="400" highlight aria-selected={invitesSelected}>
                <NavButton onClick={() => navigate(getHomeInvitesPath())}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={MailIcon} size="100" filled={invitesSelected} style={{ color: color.Primary.Main }} />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          {t('inbox.invites')}
                        </Text>
                      </Box>
                      <UnreadBadge highlight count={inviteCount} />
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
            )}
          </NavCategory>
          <Line size="300" />
          {noRoomToDisplay ? (
            <HomeEmpty />
          ) : (
            <NavCategory>
              <div
                style={{
                  position: 'relative',
                  height: virtualizer.getTotalSize(),
                }}
              >
                {virtualizer.getVirtualItems().map((vItem) => {
                  const roomId = sortedRooms[vItem.index];
                  const room = mx.getRoom(roomId);
                  if (!room) return null;
                  const selected = selectedRoomId === roomId;
                  const isDirect = mDirects.has(room.roomId);

                  return (
                    <VirtualTile
                      virtualItem={vItem}
                      key={vItem.index}
                      ref={virtualizer.measureElement}
                      style={{ top: vItem.start }}
                    >
                      <RoomNavItem
                        room={room}
                        selected={selected}
                        linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                        notificationMode={getRoomNotificationMode(
                          notificationPreferences,
                          room.roomId
                        )}
                        direct={isDirect}
                      />
                    </VirtualTile>
                  );
                })}
              </div>
            </NavCategory>
          )}
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
