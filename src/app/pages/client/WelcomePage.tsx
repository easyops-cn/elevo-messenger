import React from 'react';
import { Box, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageHero, PageHeroSection, PageMain } from '../../components/page';
import ElevoLogo from '../../../../public/res/apple/apple-touch-icon-144x144.png';

export function WelcomePage() {
  const { t } = useTranslation();
  return (
    <PageMain>
      <Page>
        <Box
          grow="Yes"
          style={{ padding: config.space.S400, paddingBottom: config.space.S700 }}
          alignItems="Center"
          justifyContent="Center"
        >
          <PageHeroSection>
            <PageHero
              icon={<img width="70" height="70" src={ElevoLogo} alt={t('auth.elevoLogo')} />}
              title={t('welcome.title')}
            />
          </PageHeroSection>
        </Box>
      </Page>
    </PageMain>
  );
}
