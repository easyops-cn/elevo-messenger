import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Box, Icon, Icons, Text } from 'folds';
import { useAtomValue, useSetAtom } from 'jotai';
import { NavCategory, NavItem, NavItemContent, NavLink } from '../../../components/nav';
import { getMeInvitesPath } from '../../pathUtils';
import {
  useMeInvitesSelected,
} from '../../../hooks/router/useMe';
import { UnreadBadge } from '../../../components/unread-badge';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { useUpdateChecker } from '../../../state/update/UpdateCheckerContext';
import { settingsModalAtom } from '../../../state/settingsModal';

function InvitesNavItem() {
  const { t } = useTranslation();
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
                {t('inbox.invites')}
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
  const { t } = useTranslation();
  const { updateAvailable } = useUpdateChecker();
  const setSettingsModal = useSetAtom(settingsModalAtom);

  const openSettings = () => {
    setSettingsModal((prev) => ({
      open: true,
      initialPage: undefined,
      requestId: prev.requestId + 1,
    }));
  };

  return (
    <PageNav stretch>
      <PageNavHeader>
        <Box grow="Yes" gap="300">
          <Box grow="Yes">
            <Text size="H4" truncate>
              {t('common.me')}
            </Text>
          </Box>
        </Box>
      </PageNavHeader>

      <PageNavContent>
        <Box direction="Column" gap="300">
          <NavCategory>
            <InvitesNavItem />
            <NavItem variant="Background" radii="400">
              <button onClick={() => openSettings()} type="button" style={{ width: '100%' }}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Setting} size="100" />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        {t('common.settings')}
                      </Text>
                    </Box>
                    {updateAvailable && (
                      <Badge variant="Critical" size="200" fill="Solid" radii="Pill" />
                    )}
                  </Box>
                </NavItemContent>
              </button>
            </NavItem>
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
