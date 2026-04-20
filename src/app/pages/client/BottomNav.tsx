import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { Badge, Icon, Icons, Tooltip, TooltipProvider } from 'folds';
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
import { Modal500 } from '../../components/Modal500';
import { Settings, SettingsPages } from '../../features/settings';
import { onOpenAbout, useUpdateChecker } from '../../state/update/UpdateCheckerContext';
import { settingsModalAtom } from '../../state/settingsModal';
import * as css from './BottomNav.css';

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());
  const { updateAvailable } = useUpdateChecker();
  const settingsModal = useAtomValue(settingsModalAtom);
  const setSettingsModal = useSetAtom(settingsModalAtom);

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

  const handleNavClick = (key: string, defaultPath: string) => {
    const activePath = navToActivePath.get(key);
    if (activePath && screenSize !== ScreenSize.Mobile) {
      navigate(joinPathComponent(activePath));
      return;
    }
    navigate(defaultPath);
  };

  const handleHomeClick = () => handleNavClick('home', getHomePath());
  const handleContactsClick = () => handleNavClick('contacts', getContactsPath());
  const handleExploreClick = () => handleNavClick('explore', getExplorePath());
  const handleMeClick = () => handleNavClick('me', getMePath());
  const closeSettings = () => setSettingsModal((prev) => ({ ...prev, open: false }));

  // BottomNav is persistent, so handle native "open about" requests here.
  useEffect(() =>
    onOpenAbout(() => {
      setSettingsModal((prev) => ({
        open: true,
        initialPage: SettingsPages.AboutPage,
        requestId: prev.requestId + 1,
      }));
    }), [setSettingsModal]);

  return (
    <>
      <div className={css.BottomNavContainer}>
        <TooltipProvider
          position="Top"
          tooltip={<Tooltip>{t('home.title')}</Tooltip>}
        >
          {(triggerRef) => (
            <button
              ref={triggerRef}
              className={css.BottomNavItem({ active: homeSelected })}
              onClick={handleHomeClick}
              aria-label={t('home.title')}
              type="button"
            >
              <Icon src={Icons.Home} filled={homeSelected} size="300" />
              {homeUnread && (
                <span className={css.BottomNavItemBadge()}>
                  <UnreadBadge highlight={homeUnread.highlight > 0} count={homeUnread.total} />
                </span>
              )}
            </button>
          )}
        </TooltipProvider>
        <TooltipProvider
          position="Top"
          tooltip={<Tooltip>{t('contacts.title')}</Tooltip>}
        >
          {(triggerRef) => (
            <button
              ref={triggerRef}
              className={css.BottomNavItem({ active: contactsSelected })}
              onClick={handleContactsClick}
              aria-label={t('contacts.title')}
              type="button"
            >
              <Icon src={ContactIcon} filled={contactsSelected} size="300" />
            </button>
          )}
        </TooltipProvider>
        <TooltipProvider
          position="Top"
          tooltip={<Tooltip>{t('explore.title')}</Tooltip>}
        >
          {(triggerRef) => (
            <button
              ref={triggerRef}
              className={css.BottomNavItem({ active: exploreSelected })}
              onClick={handleExploreClick}
              aria-label={t('explore.title')}
              type="button"
            >
              <Icon src={Icons.Explore} filled={exploreSelected} size="300" />
            </button>
          )}
        </TooltipProvider>
        <TooltipProvider
          position="Top"
          tooltip={<Tooltip>{t('common.me')}</Tooltip>}
        >
          {(triggerRef) => (
            <button
              ref={triggerRef}
              className={css.BottomNavItem({ active: meSelected })}
              onClick={handleMeClick}
              aria-label={t('common.me')}
              type="button"
            >
              <Icon src={Icons.User} filled={meSelected} size="300" />
              {inviteCount > 0 && (
                <span className={css.BottomNavItemBadge()}>
                  <UnreadBadge highlight count={inviteCount} />
                </span>
              )}
              {inviteCount === 0 && updateAvailable && (
                <span className={css.BottomNavItemBadge({ dot: true })}>
                  <Badge variant="Critical" size="200" fill="Solid" radii="Pill" />
                </span>
              )}
            </button>
          )}
        </TooltipProvider>
      </div>
      {settingsModal.open && (
        <Modal500 requestClose={closeSettings}>
          <Settings
            key={settingsModal.requestId}
            initialPage={settingsModal.initialPage}
            requestClose={closeSettings}
          />
        </Modal500>
      )}
    </>
  );
}
