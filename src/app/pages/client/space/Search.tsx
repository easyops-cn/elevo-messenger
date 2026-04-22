import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Icon, Icons, Text, Scroll, IconButton } from 'folds';
import { Page, PageContent, PageContentCenter, PageHeader, PageMain } from '../../../components/page';
import { MessageSearch } from '../../../features/message-search';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { BackRouteHandler } from '../../../components/BackRouteHandler';
import { SearchIcon } from '../../../icons/SearchIcon';

export function SpaceSearch() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const screenSize = useScreenSizeContext();

  return (
    <PageMain>
      <Page>
        <PageHeader balance>
          <Box grow="Yes" alignItems="Center" gap="200">
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
            <Box justifyContent="Center" alignItems="Center" gap="200">
              {screenSize !== ScreenSize.Mobile && <Icon size="300" src={SearchIcon} />}
              <Text size="H5" truncate>
                {t('lobby.messageSearch')}
              </Text>
            </Box>
            <Box grow="Yes" basis="No" />
          </Box>
        </PageHeader>
        <Box style={{ position: 'relative' }} grow="Yes">
          <Scroll ref={scrollRef} hideTrack visibility="Hover">
            <PageContent>
              <PageContentCenter>
                <MessageSearch scrollRef={scrollRef} />
              </PageContentCenter>
            </PageContent>
          </Scroll>
        </Box>
      </Page>
    </PageMain>
  );
}
