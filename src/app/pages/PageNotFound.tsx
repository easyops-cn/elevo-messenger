import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { Page, PageHero, PageHeroSection } from '../components/page';
import { getHomePath } from './pathUtils';
import * as css from './PageNotFound.css';

export function PageNotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page>
      <Box className={css.PageNotFound} grow="Yes">
        <PageHeroSection className={css.HeroSection}>
          <PageHero
            icon={<Icon size="600" src={Icons.Info} />}
            title={t('notFound.title')}
            subTitle={t('notFound.description')}
          >
            <Box justifyContent="Center">
              <Button onClick={() => navigate(getHomePath())}>
                <Text size="B400">{t('notFound.backHome')}</Text>
              </Button>
            </Box>
          </PageHero>
        </PageHeroSection>
      </Box>
    </Page>
  );
}
