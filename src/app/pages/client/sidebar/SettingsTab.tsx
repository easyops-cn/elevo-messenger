import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Text } from 'folds';
import { SidebarItem, SidebarItemTooltip, SidebarAvatar, SidebarItemBadge } from '../../../components/sidebar';
import { useUpdateChecker } from '../../../state/update/UpdateCheckerContext';
import { onOpenAbout } from '../../../state/update/UpdateCheckerContext';
import { UserAvatar } from '../../../components/user-avatar';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { nameInitials } from '../../../utils/common';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { Settings, SettingsPages } from '../../../features/settings';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { Modal500 } from '../../../components/Modal500';

export function SettingsTab() {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { updateAvailable } = useUpdateChecker();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);

  const [settings, setSettings] = useState(false);
  const [initialPage, setInitialPage] = useState<SettingsPages | undefined>(undefined);

  const displayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const openSettings = () => {
    setInitialPage(undefined);
    setSettings(true);
  };
  const closeSettings = () => setSettings(false);

  // Listen for "open about" requests from the native menu update check.
  useEffect(() => onOpenAbout(() => {
    setInitialPage(SettingsPages.AboutPage);
    setSettings(true);
  }), []);

  return (
    <SidebarItem active={settings}>
      <SidebarItemTooltip tooltip={t('sidebar.userSettings')}>
        {(triggerRef) => (
          <SidebarAvatar as="button" ref={triggerRef} onClick={openSettings}>
            <UserAvatar
              userId={userId}
              src={avatarUrl}
              renderFallback={() => <Text size="H4">{nameInitials(displayName)}</Text>}
            />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {updateAvailable && (
        <SidebarItemBadge>
          <Badge variant="Critical" size="200" fill="Solid" radii="Pill" />
        </SidebarItemBadge>
      )}
      {settings && (
        <Modal500 requestClose={closeSettings}>
          <Settings initialPage={initialPage} requestClose={closeSettings} />
        </Modal500>
      )}
    </SidebarItem>
  );
}
