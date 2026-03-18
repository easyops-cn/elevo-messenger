import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, IconButton, Text, Scroll, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { PowerLevelsContextProvider, usePowerLevels } from '../../../hooks/usePowerLevels';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useContactsRoleSelected } from '../../../hooks/router/useContacts';
import { CONTACTS_ROOM_ID } from './ContactsContext';
import { ContactsMemberList } from './ContactsPage';
import { UsersIcon } from '../../../icons/UsersIcon';

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
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const selectedRole = useContactsRoleSelected();
  const room = mx.getRoom(CONTACTS_ROOM_ID);
  const roleName = selectedRole ?? '';

  return (
    <Page>
      <PageHeader balance>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" basis="No">
            {screenSize === ScreenSize.Mobile && (
              <BackRouteHandler>
                {(onBack) => (
                  <IconButton onClick={onBack}>
                    <Icon src={Icons.ArrowLeft} />
                  </IconButton>
                )}
              </BackRouteHandler>
            )}
          </Box>
          <Box alignItems="Center" gap="200">
            <Icon size="400" src={UsersIcon} />
            <Text size="H3" truncate>
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
  );
}
