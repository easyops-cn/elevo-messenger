import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Text, IconButton, Icon, Icons, Scroll, Button, config, toRem } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import ElevoLogo from '../../../../../public/res/apple/apple-touch-icon-144x144.png';
import { clearCacheAndReload } from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useUpdateChecker } from '../../../state/update/UpdateCheckerContext';
import { isDesktopTauri } from '../../../plugins/useTauriOpener';

type AboutProps = {
  requestClose: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k**i).toFixed(1)} ${sizes[i]}`;
}

export function About({ requestClose }: AboutProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const {
    checking, downloading, updateAvailable, updateDownloaded, checked,
    version, progress, error, checkAndPrepare, applyUpdate,
  } = useUpdateChecker();

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              {t('settings.about')}
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box gap="400">
                <Box shrink="No">
                  <img
                    style={{ width: toRem(60), height: toRem(60) }}
                    src={ElevoLogo}
                    alt={t('settings.aboutPage.elevoLogo')}
                  />
                </Box>
                <Box direction="Column" gap="300">
                  <Box direction="Column" gap="100">
                    <Box gap="100" alignItems="End">
                      <Text size="H3">Elevo Messenger</Text>
                      <Text size="T200">{`v${__APP_VERSION__}`}</Text>
                    </Box>
                    <Text>{t('settings.aboutPage.tagline')}</Text>
                  </Box>

                  <Box gap="200" wrap="Wrap">
                    <Button
                      as="a"
                      href="https://github.com/easyops-cn/elevo-desktop"
                      rel="noreferrer noopener"
                      target="_blank"
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      before={<Icon src={Icons.Code} size="100" filled />}
                    >
                      <Text size="B300">{t('settings.aboutPage.sourceCode')}</Text>
                    </Button>
                  </Box>
                </Box>
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">{t('common.options')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title={t('settings.aboutPage.clearCache')}
                    description={t('settings.aboutPage.clearCacheDesc')}
                    after={
                      <Button
                        onClick={() => clearCacheAndReload(mx)}
                        variant="Secondary"
                        fill="Soft"
                        size="300"
                        radii="300"
                        outlined
                      >
                        <Text size="B300">{t('settings.aboutPage.clearCacheBtn')}</Text>
                      </Button>
                    }
                  />
                </SequenceCard>
                {isDesktopTauri && (
                  <SequenceCard
                    className={SequenceCardStyle}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="400"
                  >
                    <SettingTile
                      title={t('settings.aboutPage.checkForUpdates')}
                      description={
                        <>
                          {updateDownloaded
                            ? t('settings.aboutPage.updateReady', { version })
                            : downloading
                              ? (progress?.total
                                  ? t('settings.aboutPage.downloadingUpdate', {
                                      downloaded: formatBytes(progress.downloaded),
                                      total: formatBytes(progress.total),
                                    })
                                  : t('settings.aboutPage.downloading'))
                              : checking
                                ? t('settings.aboutPage.checkingForUpdates')
                                : error || (updateAvailable
                                    ? t('settings.aboutPage.updateAvailable', { version })
                                    : checked
                                      ? t('settings.aboutPage.noUpdatesAvailable')
                                      : t('settings.aboutPage.checkForUpdatesDesc'))}
                          {(updateAvailable || updateDownloaded) && (
                            <>
                              <br />
                              <a
                                href={`https://github.com/easyops-cn/elevo-desktop/releases/tag/elevo-messenger-v${version}`}
                                rel="noreferrer noopener"
                                target="_blank"
                              >
                                {t('settings.aboutPage.viewReleaseNotes', { defaultValue: 'View Release Notes' })}
                              </a>
                            </>
                          )}
                        </>
                      }
                      after={
                        updateDownloaded ? (
                          <Button
                            onClick={applyUpdate}
                            variant="Primary"
                            fill="Solid"
                            size="300"
                            radii="300"
                          >
                            <Text size="B300">{t('settings.aboutPage.restartToUpdate')}</Text>
                          </Button>
                        ) : updateAvailable && !downloading ? (
                          <Button
                            onClick={applyUpdate}
                            variant="Primary"
                            fill="Solid"
                            size="300"
                            radii="300"
                          >
                            <Text size="B300">{t('settings.aboutPage.updateAndRestart', { defaultValue: 'Update and Restart' })}</Text>
                          </Button>
                        ) : (
                          <Button
                            onClick={checkAndPrepare}
                            variant="Secondary"
                            fill="Soft"
                            size="300"
                            radii="300"
                            outlined
                            disabled={checking || downloading}
                          >
                            <Text size="B300">
                              {downloading
                                ? t('settings.aboutPage.downloading')
                                : checking
                                  ? t('settings.aboutPage.checking')
                                  : error
                                    ? t('settings.aboutPage.retry')
                                    : t('settings.aboutPage.check')}
                            </Text>
                          </Button>
                        )
                      }
                    />
                  </SequenceCard>
                )}
              </Box>
              <Box direction="Column" gap="100">
                <Text size="L400">{t('settings.aboutPage.credits')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <Box
                    as="ul"
                    direction="Column"
                    gap="200"
                    style={{
                      margin: 0,
                      paddingLeft: config.space.S400,
                    }}
                  >
                    <li>
                      <Text size="T300">
                        This project is forked from{' '}
                        <a
                          href="https://github.com/cinnyapp/cinny"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          cinnyapp/cinny
                        </a>{' '}
                        which is licensed under{' '}
                        <a
                          href="https://github.com/cinnyapp/cinny/blob/dev/LICENSE"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          AGPL-3.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://github.com/matrix-org/matrix-js-sdk"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          matrix-js-sdk
                        </a>{' '}
                        is ©{' '}
                        <a
                          href="https://matrix.org/foundation"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          The Matrix.org Foundation C.I.C
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="http://www.apache.org/licenses/LICENSE-2.0"
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          Apache 2.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://github.com/mozilla/twemoji-colr"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          twemoji-colr
                        </a>{' '}
                        font is ©{' '}
                        <a href="https://mozilla.org/" target="_blank" rel="noreferrer noopener">
                          Mozilla Foundation
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="http://www.apache.org/licenses/LICENSE-2.0"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Apache 2.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://twemoji.twitter.com"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Twemoji
                        </a>{' '}
                        emoji art is ©{' '}
                        <a
                          href="https://twemoji.twitter.com"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Twitter, Inc and other contributors
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="https://creativecommons.org/licenses/by/4.0/"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          CC-BY 4.0
                        </a>
                        .
                      </Text>
                    </li>
                    <li>
                      <Text size="T300">
                        The{' '}
                        <a
                          href="https://material.io/design/sound/sound-resources.html"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Material sound resources
                        </a>{' '}
                        are ©{' '}
                        <a href="https://google.com" target="_blank" rel="noreferrer noopener">
                          Google
                        </a>{' '}
                        used under the terms of{' '}
                        <a
                          href="https://creativecommons.org/licenses/by/4.0/"
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          CC-BY 4.0
                        </a>
                        .
                      </Text>
                    </li>
                  </Box>
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
