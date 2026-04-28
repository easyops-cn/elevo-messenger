import React from 'react';
import classNames from 'classnames';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { Box, Chip, Header, Icon, IconButton, Icons, Spinner, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { VideoContent } from '../message/content/VideoContent';
import { ThumbnailContent } from '../message/content/ThumbnailContent';
import { Image } from '../media/Image';
import { Video } from '../media/Video';
import type { IThumbnailContent, IVideoInfo } from '../../../types/matrix/common';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { useMediaDownload } from '../../hooks/useMediaDownload';
import * as css from './VideoViewer.css';

export type VideoViewerProps = {
  name: string;
  mimeType: string;
  url: string;
  info: IVideoInfo & IThumbnailContent;
  encInfo?: EncryptedAttachmentInfo;
  requestClose: () => void;
};

export const VideoViewer = as<'div', VideoViewerProps>(
  ({ className, name, mimeType, url, info, encInfo, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const [downloadState, download] = useMediaDownload(url, mimeType, name, encInfo);

    return (
      <Box
        className={classNames(css.VideoViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.VideoViewerHeader} size="400">
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
          className={css.VideoViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <VideoContent
            className={css.VideoViewerPlayer}
            body={name}
            mimeType={mimeType}
            url={url}
            info={info}
            encInfo={encInfo}
            renderThumbnail={() => (
              <ThumbnailContent
                info={info}
                renderImage={(src) => <Image alt={name} title={name} src={src} loading="lazy" />}
              />
            )}
            renderVideo={(videoProps) => <Video {...videoProps} />}
          />
        </Box>
      </Box>
    );
  }
);
