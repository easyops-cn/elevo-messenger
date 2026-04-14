import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAtomValue, useSetAtom } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import {
  NavButton,
  NavCategory,
  NavEmptyCenter,
  NavEmptyLayout,
  NavItem,
  NavItemContent,
} from '../../../components/nav';
import {
  getHomeCreatePath,
  getHomeCreateChatPath,
  getHomeRoomPath,
} from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeCreateChatSelected,
} from '../../../hooks/router/useHomeSelected';
import { useAllHomeRooms } from './useAllHomeRooms';
import { useHomeRooms } from './useHomeRooms';
import { useDirectRooms } from '../direct/useDirectRooms';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavItem } from '../../../features/room-nav';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavHeader, PageNavContent } from '../../../components/page';
import { useRoomsUnread } from '../../../state/hooks/unread';
import { markAsRead } from '../../../utils/notifications';
import { stopPropagation } from '../../../utils/keyboard';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { mDirectAtom } from '../../../state/mDirectList';
import { searchModalAtom } from '../../../state/searchModal';

type HomeMenuProps = {
  requestClose: () => void;
  rooms: string[];
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose, rooms }, ref) => {
  const { t } = useTranslation();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const unread = useRoomsUnread(rooms, roomToUnreadAtom);
  const mx = useMatrixClient();

  const handleMarkAsRead = () => {
    if (!unread) return;
    rooms.forEach((rId) => markAsRead(mx, rId, hideActivity));
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          aria-disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            {t('room.markAsRead')}
          </Text>
        </MenuItem>
      </Box>
    </Menu>
  );
});

function HomeHeader({ rooms }: { rooms: string[] }) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Elevo Messenger
            </Text>
          </Box>
          <Box>
            <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
              <Icon src={Icons.VerticalDots} size="200" />
            </IconButton>
          </Box>
        </Box>
      </PageNavHeader>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <HomeMenu requestClose={() => setMenuAnchor(undefined)} rooms={rooms} />
          </FocusTrap>
        }
      />
    </>
  );
}

type HomeRoomFilter = 'people' | 'rooms';

function HomeFilterChips({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: HomeRoomFilter | null;
  onFilterChange: (filter: HomeRoomFilter | null) => void;
}) {
  const { t } = useTranslation();

  const handleFilterClick = (filter: HomeRoomFilter) => {
    onFilterChange(activeFilter === filter ? null : filter);
  };

  return (
    <Box gap="100" wrap="Wrap">
      <Chip
        variant={activeFilter === 'people' ? 'Success' : 'SurfaceVariant'}
        outlined
        radii="Pill"
        aria-pressed={activeFilter === 'people'}
        onClick={() => handleFilterClick('people')}
      >
        <Text size="T200" priority={activeFilter === 'people' ? '500' : '300'}>
          {t('home.filter.people')}
        </Text>
      </Chip>
      <Chip
        variant={activeFilter === 'rooms' ? 'Success' : 'SurfaceVariant'}
        outlined
        radii="Pill"
        aria-pressed={activeFilter === 'rooms'}
        onClick={() => handleFilterClick('rooms')}
      >
        <Text size="T200" priority={activeFilter === 'rooms' ? '500' : '300'}>
          {t('home.filter.rooms')}
        </Text>
      </Chip>
      {activeFilter && (
        <Chip
          variant="SurfaceVariant"
          outlined
          radii="Pill"
          onClick={() => onFilterChange(null)}
        >
          <Box alignItems="Center">
            <Icon src={Icons.Cross} size="100" />
          </Box>
        </Chip>
      )}
    </Box>
  );
}

function HomeEmpty({ activeFilter }: { activeFilter: HomeRoomFilter | null }) {
  const { t } = useTranslation();
  const isPeople = activeFilter === 'people';

  return (
    <NavEmptyCenter>
      <NavEmptyLayout
        icon={<Icon size="600" src={isPeople ? Icons.Mention : Icons.Hash} />}
        title={
          <Text size="H5" align="Center">
            {isPeople ? t('home.noDirectMessages') : t('home.noRooms')}
          </Text>
        }
        content={
          <Text size="T300" align="Center">
            {isPeople ? t('home.noDirectMessagesDesc') : t('home.noRoomsDesc')}
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

  const [activeFilter, setActiveFilter] = useState<HomeRoomFilter | null>(null);

  const allRooms = useAllHomeRooms();
  const groupRooms = useHomeRooms();
  const directRooms = useDirectRooms();
  const rooms = activeFilter === 'people' ? directRooms : activeFilter === 'rooms' ? groupRooms : allRooms;

  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const navigate = useNavigate();

  const selectedRoomId = useSelectedRoom();
  const createRoomSelected = useHomeCreateSelected();
  const createChatSelected = useHomeCreateChatSelected();
  const setSearchOpen = useSetAtom(searchModalAtom);
  const noRoomToDisplay = rooms.length === 0;

  const sortedRooms = useMemo(() => {
    const items = Array.from(rooms).sort(factoryRoomIdByActivity(mx));
    return items;
  }, [mx, rooms]);

  const virtualizer = useVirtualizer({
    count: sortedRooms.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 38,
    overscan: 10,
  });


  return (
    <PageNav stretch>
      <HomeHeader rooms={rooms} />
      <PageNavContent scrollRef={scrollRef}>
          <Box direction="Column" gap="300">
            <NavCategory>
              <NavItem variant="Background" radii="400" aria-selected={createRoomSelected}>
                <NavButton onClick={() => navigate(getHomeCreatePath())}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Plus} size="100" />
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
                        <Icon src={Icons.Message} size="100" />
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
              <NavItem variant="Background" radii="400">
                <NavButton onClick={() => setSearchOpen(true)}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400">
                        <Icon src={Icons.Search} size="100" />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          {t('home.search')}
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </NavButton>
              </NavItem>
            </NavCategory>
            <HomeFilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            {noRoomToDisplay ? (
              <HomeEmpty activeFilter={activeFilter} />
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
                      >
                        <RoomNavItem
                          room={room}
                          selected={selected}
                          linkPath={getHomeRoomPath(getCanonicalAliasOrRoomId(mx, roomId))}
                          notificationMode={getRoomNotificationMode(
                            notificationPreferences,
                            room.roomId
                          )}
                          showAvatar={isDirect}
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
