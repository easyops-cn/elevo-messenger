import React from 'react';
import { Box, Icon, Icons, IconButton, Scroll, Text, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoomMembers } from '../../../hooks/useRoomMembers';
import { PowerLevelsContextProvider, usePowerLevels } from '../../../hooks/usePowerLevels';
import { MembersDrawer } from '../../../features/room/MembersDrawer';

const CONTACTS_ROOM_ID = '!soqAfmrZyVbUygvYFp:m.easyops.local';

type ContactsRoomMembersProps = {
  room: Room;
};
function ContactsRoomMembers({ room }: ContactsRoomMembersProps) {
  const mx = useMatrixClient();
  const members = useRoomMembers(mx, room.roomId);
  const powerLevels = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevels}>
      <MembersDrawer room={room} members={members} />
    </PowerLevelsContextProvider>
  );
}

export function ContactsPage() {
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const room = mx.getRoom(CONTACTS_ROOM_ID);

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
            {screenSize !== ScreenSize.Mobile && <Icon size="400" src={Icons.UserPlus} />}
            <Text size="H3" truncate>
              Contacts
            </Text>
          </Box>
          <Box grow="Yes" basis="No" />
        </Box>
      </PageHeader>

      <Box style={{ position: 'relative' }} grow="Yes">
        {room ? (
          <ContactsRoomMembers room={room} />
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
                  <Text>Room not found</Text>
                  <Text size="T200">The contacts room could not be found.</Text>
                </Box>
              </PageContentCenter>
            </PageContent>
          </Scroll>
        )}
      </Box>
    </Page>
  );
}
