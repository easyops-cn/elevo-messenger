import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { color, Icon, Icons, Tooltip, TooltipProvider } from 'folds';
import { ContactIcon } from '../../icons/ContactIcon';
import { useHomeSelected } from '../../hooks/router/useHomeSelected';
import { useContactsSelected } from '../../hooks/router/useContacts';
import { useExploreSelected } from '../../hooks/router/useExploreSelected';
import { useRoomsUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { useAllHomeRooms } from './home/useAllHomeRooms';
import { UnreadBadge } from '../../components/unread-badge';
import { useNavToActivePathAtom } from '../../state/hooks/navToActivePath';
import { useMeSelected } from '../../hooks/router/useMe';
import {
  getHomePath,
  getContactsPath,
  getExplorePath,
  getMePath,
  joinPathComponent,
} from '../pathUtils';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useDeviceList, useSplitCurrentDevice } from '../../hooks/useDeviceList';
import {
  useDeviceVerificationStatus,
  VerificationStatus,
} from '../../hooks/useDeviceVerificationStatus';
import * as css from './BottomNav.css';

export function BottomNav() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());

  const homeSelected = useHomeSelected();
  const contactsSelected = useContactsSelected();
  const exploreSelected = useExploreSelected();
  const meSelected = useMeSelected();

  // Home badge
  const homeRooms = useAllHomeRooms();
  const homeUnread = useRoomsUnread(homeRooms, roomToUnreadAtom);

  // Me badge
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  // Unverified devices
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const [devices] = useDeviceList();
  const [currentDevice] = useSplitCurrentDevice(devices);
  const verificationStatus = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    currentDevice?.device_id
  );
  const unverified = verificationStatus === VerificationStatus.Unverified;

  const meIconColor = unverified
      ? color.Critical.Main
      : undefined;

  const handleHomeClick = () => {
    const activePath = navToActivePath.get('home');
    if (activePath && screenSize !== ScreenSize.Mobile) {
      navigate(joinPathComponent(activePath));
      return;
    }
    navigate(getHomePath());
  };

  return (
    <div className={css.BottomNavContainer}>
      <TooltipProvider
        position="Top"
        tooltip={<Tooltip>Home</Tooltip>}
      >
        {(triggerRef) => (
          <button
            ref={triggerRef}
            className={css.BottomNavItem({ active: homeSelected })}
            onClick={handleHomeClick}
            aria-label="Home"
            type="button"
          >
            <Icon src={Icons.Home} filled={homeSelected} size="300" />
            {homeUnread && (
              <span className={css.BottomNavItemBadge}>
                <UnreadBadge highlight={homeUnread.highlight > 0} count={homeUnread.total} />
              </span>
            )}
          </button>
        )}
      </TooltipProvider>
      <TooltipProvider
        position="Top"
        tooltip={<Tooltip>Contacts</Tooltip>}
      >
        {(triggerRef) => (
          <button
            ref={triggerRef}
            className={css.BottomNavItem({ active: contactsSelected })}
            onClick={() => navigate(getContactsPath())}
            aria-label="Contacts"
            type="button"
          >
            <Icon src={ContactIcon} filled={contactsSelected} size="300" />
          </button>
        )}
      </TooltipProvider>
      <TooltipProvider
        position="Top"
        tooltip={<Tooltip>Explore</Tooltip>}
      >
        {(triggerRef) => (
          <button
            ref={triggerRef}
            className={css.BottomNavItem({ active: exploreSelected })}
            onClick={() => navigate(getExplorePath())}
            aria-label="Explore"
            type="button"
          >
            <Icon src={Icons.Explore} filled={exploreSelected} size="300" />
          </button>
        )}
      </TooltipProvider>
      <TooltipProvider
        position="Top"
        tooltip={<Tooltip>Me</Tooltip>}
      >
        {(triggerRef) => (
          <button
            ref={triggerRef}
            className={css.BottomNavItem({ active: meSelected })}
            onClick={() => navigate(getMePath())}
            aria-label="Me"
            type="button"
          >
            <Icon src={Icons.User} filled={meSelected} size="300" style={meIconColor ? { color: meIconColor } : undefined} />
            {inviteCount > 0 && (
              <span className={css.BottomNavItemBadge}>
                <UnreadBadge highlight count={inviteCount} />
              </span>
            )}
          </button>
        )}
      </TooltipProvider>
    </div>
  );
}
