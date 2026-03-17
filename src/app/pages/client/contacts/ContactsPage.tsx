import React from 'react';
import { Box, Icon, Icons, IconButton, Scroll, Text, config } from 'folds';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { ContainerColor } from '../../../styles/ContainerColor.css';

export function ContactsPage() {
  const screenSize = useScreenSizeContext();

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
                <Text>Contacts</Text>
                <Text size="T200">Your contacts will appear here.</Text>
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
