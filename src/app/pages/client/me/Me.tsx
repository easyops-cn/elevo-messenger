import React, { useEffect, useState } from 'react';
import { Avatar, Box, color, Icon, Icons, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getMeInvitesPath, getMeNotificationsPath } from '../../pathUtils';
import {
  useMeInvitesSelected,
  useMeNotificationsSelected,
} from '../../../hooks/router/useMe';
import { UnreadBadge } from '../../../components/unread-badge';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { Modal500 } from '../../../components/Modal500';
import { Settings, SettingsPages } from '../../../features/settings';
import { onOpenAbout } from '../../../state/update/UpdateCheckerContext';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useDeviceIds, useDeviceList, useSplitCurrentDevice } from '../../../hooks/useDeviceList';
import {
  useDeviceVerificationStatus,
  useUnverifiedDeviceCount,
  VerificationStatus,
} from '../../../hooks/useDeviceVerificationStatus';
import { useCrossSigningActive } from '../../../hooks/useCrossSigning';

function InvitesNavItem() {
  const invitesSelected = useMeInvitesSelected();
  const allInvites = useAtomValue(allInvitesAtom);
  const inviteCount = allInvites.length;

  return (
    <NavItem
      variant="Background"
      radii="400"
      highlight={inviteCount > 0}
      aria-selected={invitesSelected}
    >
      <NavLink to={getMeInvitesPath()}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="200">
            <Avatar size="200" radii="400">
              <Icon src={Icons.Mail} size="100" filled={invitesSelected} />
            </Avatar>
            <Box as="span" grow="Yes">
              <Text as="span" size="Inherit" truncate>
                Invites
              </Text>
            </Box>
            {inviteCount > 0 && <UnreadBadge highlight count={inviteCount} />}
          </Box>
        </NavItemContent>
      </NavLink>
    </NavItem>
  );
}

export function Me() {
  useNavToActivePathMapper('me');
  const notificationsSelected = useMeNotificationsSelected();

  const [settings, setSettings] = useState(false);
  const [initialPage, setInitialPage] = useState<SettingsPages | undefined>(undefined);

  // Unverified devices
  const crossSigningActive = useCrossSigningActive();
  const mx = useMatrixClient();
  const crypto = mx.getCrypto();
  const [devices] = useDeviceList();
  const [currentDevice, otherDevices] = useSplitCurrentDevice(devices);
  const verificationStatus = useDeviceVerificationStatus(
    crypto,
    mx.getSafeUserId(),
    currentDevice?.device_id
  );
  const unverified = verificationStatus === VerificationStatus.Unverified;
  const otherDevicesId = useDeviceIds(otherDevices);
  const unverifiedDeviceCount = useUnverifiedDeviceCount(crypto, mx.getSafeUserId(), otherDevicesId);

  const hasUnverified =
    crossSigningActive &&
    (unverified || (unverifiedDeviceCount !== undefined && unverifiedDeviceCount > 0));

  const openSettings = (page?: SettingsPages) => {
    setInitialPage(page);
    setSettings(true);
  };
  const closeSettings = () => setSettings(false);

  // Listen for "open about" requests from the native menu update check.
  useEffect(() =>
    onOpenAbout(() => {
      setInitialPage(SettingsPages.AboutPage);
      setSettings(true);
    }), []);

  return (
    <PageNav>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              Me
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={notificationsSelected}>
              <NavLink to={getMeNotificationsPath()}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.MessageUnread} size="100" filled={notificationsSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Notifications
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
            <InvitesNavItem />
            {hasUnverified && (
              <NavItem variant="Background" radii="400">
                <button onClick={() => openSettings(SettingsPages.DevicesPage)} type="button" style={{ width: '100%' }}>
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400" style={unverified ? { backgroundColor: color.Critical.Container, color: color.Critical.OnContainer } : { backgroundColor: color.Warning.Container, color: color.Warning.OnContainer }}>
                        <Icon
                          src={Icons.ShieldUser}
                          size="100"
                          style={{ color: unverified ? color.Critical.Main : color.Warning.Main }}
                        />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          Unverified Devices
                        </Text>
                      </Box>
                    </Box>
                  </NavItemContent>
                </button>
              </NavItem>
            )}
            <NavItem variant="Background" radii="400">
              <button onClick={openSettings} type="button" style={{ width: '100%' }}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Setting} size="100" />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Settings
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </button>
            </NavItem>
          </NavCategory>
        </Box>
      </PageNavContent>
      {settings && (
        <Modal500 requestClose={closeSettings}>
          <Settings initialPage={initialPage} requestClose={closeSettings} />
        </Modal500>
      )}
    </PageNav>
  );
}
