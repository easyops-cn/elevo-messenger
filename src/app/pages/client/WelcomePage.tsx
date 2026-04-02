import React from 'react';
import { Box, Button, Icon, Icons, Text, config, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import ElevoLogo from '../../../../public/res/apple/apple-touch-icon-144x144.png';

export function WelcomePage() {
  const { t } = useTranslation();
  return (
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
            subTitle={
              <span>
                {t('welcome.subtitle')}{' '}
                <a
                  href="https://github.com/easyops-cn/elevo-desktop/releases"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  v1.0.3
                </a>
              </span>
            }
          >
            <Box justifyContent="Center">
              <Box grow="Yes" style={{ maxWidth: toRem(300) }} direction="Column" gap="300">
                <Button
                  as="a"
                  href="https://github.com/easyops-cn/elevo-desktop"
                  target="_blank"
                  rel="noreferrer noopener"
                  before={<Icon size="200" src={Icons.Code} />}
                >
                  <Text as="span" size="B400" truncate>
                    {t('welcome.sourceCode')}
                  </Text>
                </Button>
              </Box>
            </Box>
          </PageHero>
        </PageHeroSection>
      </Box>
    </Page>
  );
}
