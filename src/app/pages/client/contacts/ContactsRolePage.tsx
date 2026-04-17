import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, IconButton, Text, Scroll, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { PowerLevelsContextProvider, usePowerLevels } from '../../../hooks/usePowerLevels';
import { Page, PageContent, PageContentCenter, PageHeader, PageMain } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useContactsRoleSelected } from '../../../hooks/router/useContacts';
import { useContactsContext } from './ContactsContext';
import { ContactsMemberList } from './ContactsPage';
import { ContactIcon } from '../../../icons/ContactIcon';

function ContactsRoleRoomMembers({ room, filterRole }: { room: Room; filterRole: string }) {
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, room.roomId);
  const powerLevels = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <ContactsMemberList room={room} members={members} filterRole={filterRole} />
    </PowerLevelsContextProvider>
  );
}

export function ContactsRolePage() {
  const { t } = useTranslation();
  const screenSize = useScreenSizeContext();
  const selectedRole = useContactsRoleSelected();
  const { room } = useContactsContext();
  const roleName = selectedRole ?? '';

  return (
    <PageMain>
      <Page>
        <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" basis="No">
            {screenSize === ScreenSize.Mobile && (
              <BackRouteHandler>
                {(onBack) => (
                  <IconButton size="300" fill="None" onClick={onBack}>
                    <Icon size="100" src={Icons.ArrowLeft} />
                  </IconButton>
                )}
              </BackRouteHandler>
            )}
          </Box>
          <Box alignItems="Center" gap="200">
            <Icon size="400" src={ContactIcon} />
            <Text size="H5" truncate>
              {roleName}
            </Text>
          </Box>
          <Box grow="Yes" basis="No" />
        </Box>
      </PageHeader>

      <Box style={{ position: 'relative' }} grow="Yes">
        {room ? (
          <ContactsRoleRoomMembers room={room} filterRole={roleName} />
        ) : (
          <Scroll hideTrack visibility="Hover">
            <PageContent>
              <PageContentCenter>
                <Box
                  className={ContainerColor({ variant: 'SurfaceVariant' })}
                  style={{
                    padding: config.space.S300,
                    borderRadius: config.radii.R400,
                  }}
                  direction="Column"
                  gap="200"
                >
                  <Text>{t('contacts.roomNotFound')}</Text>
                  <Text size="T200">{t('contacts.roomNotFoundDesc')}</Text>
                </Box>
              </PageContentCenter>
            </PageContent>
          </Scroll>
        )}
      </Box>
    </Page>
    </PageMain>
  );
}
