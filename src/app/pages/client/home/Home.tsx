import React, { MouseEventHandler, forwardRef, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  color,
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
import { getHomeCreatePath, getHomeCreateChatPath, getHomeRoomPath } from '../../pathUtils';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useHomeCreateSelected,
  useHomeCreateChatSelected,
} from '../../../hooks/router/useHomeSelected';
import { useAllHomeRooms } from './useAllHomeRooms';
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
import { HashIcon } from '../../../icons/HashIcon';

type HomeHeaderProps = {
  rooms: string[];
  onSearchOpen: () => void;
};

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

function HomeHeader({ rooms, onSearchOpen }: HomeHeaderProps) {
  const { t } = useTranslation();
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
        <Box alignItems="Center" grow="Yes" gap="200">
          <Box grow="Yes">
            <Button
              onClick={onSearchOpen}
              size="300"
              variant="Secondary"
              radii="Pill"
              fill="Soft"
              before={<Icon size="200" src={Icons.Search} style={{ opacity: config.opacity.Placeholder }} />}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                height: toRem(28),
                padding: `0 ${config.space.S300}`,
                fontSize: toRem(13),
              }}
            >
              <Text size="T300" truncate style={{ opacity: config.opacity.Placeholder }}>
                {t('home.search')}
              </Text>
            </Button>
          </Box>
          <Box shrink="No">
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
      <HomeHeader rooms={rooms} onSearchOpen={() => setSearchOpen(true)} />
      <PageNavContent scrollRef={scrollRef}>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={createRoomSelected}>
              <NavButton onClick={() => navigate(getHomeCreatePath())}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Plus} size="200" style={{ color: color.Primary.Main }} />
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
