import React from 'react';
import classNames from 'classnames';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { Box, Chip, Header, Icon, IconButton, Icons, Spinner, Text, as, color, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { AudioContent } from '../message/content/AudioContent';
import { VoiceMessage } from '../message/content/VoiceMessage';
import { MediaControl } from '../media/MediaControls';
import type { IAudioInfo } from '../../../types/matrix/common';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useMediaDownload } from '../../hooks/useMediaDownload';
import * as css from './AudioViewer.css';

export type AudioViewerProps = {
  name: string;
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  waveform?: number[];
  requestClose: () => void;
};

export const AudioViewer = as<'div', AudioViewerProps>(
  ({ className, name, mimeType, url, info, encInfo, waveform, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const [downloadState, download] = useMediaDownload(url, mimeType, name, encInfo);
    const hasWaveform = Array.isArray(waveform) && waveform.length > 0;

    return (
      <Box
        className={classNames(css.AudioViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.AudioViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant={downloadState.status === AsyncStatus.Error ? 'Critical' : 'Primary'}
              onClick={download}
              radii="300"
              disabled={downloadState.status === AsyncStatus.Loading}
              before={
                downloadState.status === AsyncStatus.Loading ? (
                  <Spinner size="50" variant="Secondary" />
                ) : (
                  <Icon size="50" src={Icons.Download} />
                )
              }
            >
              <Text size="B300">{t('viewer.download')}</Text>
            </Chip>
          </Box>
        </Header>

        <Box
          grow="Yes"
          className={css.AudioViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <Box className={css.AudioViewerInner}>
            {hasWaveform ? (
              <Box
                className={css.AudioViewerControl}
                style={{
                  padding: config.space.S300,
                  backgroundColor: color.SurfaceVariant.Container,
                  color: color.SurfaceVariant.OnContainer,
                  borderRadius: config.radii.R400,
                }}
              >
                <VoiceMessage
                  mimeType={mimeType}
                  url={url}
                  info={info}
                  encInfo={encInfo}
                  waveform={waveform}
                />
              </Box>
            ) : (
              <AudioContent
                info={info}
                mimeType={mimeType}
                url={url}
                encInfo={encInfo}
                renderMediaControl={(mediaProps) => (
                  <MediaControl className={css.AudioViewerControl} {...mediaProps} />
                )}
              />
            )}
          </Box>
        </Box>
      </Box>
    );
  }
);
