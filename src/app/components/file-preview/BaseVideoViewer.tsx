import React from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { Video } from '../media/Video';
import * as css from '../video-viewer/VideoViewer.css';

export type BaseVideoViewerProps = {
  name: string;
  src: string;
  hideCloseButton?: boolean;
  requestClose: () => void;
  onDownload: () => Promise<void>;
};

export const BaseVideoViewer = as<'div', BaseVideoViewerProps>(
  ({ className, name, src, hideCloseButton, requestClose, onDownload, ...props }, ref) => {
    const { t } = useTranslation();

    return (
      <Box
        className={classNames(css.VideoViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.VideoViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            {!hideCloseButton && (
              <IconButton size="300" radii="300" onClick={requestClose}>
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant="Primary"
              onClick={onDownload}
              radii="300"
              before={<Icon size="50" src={Icons.Download} />}
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
          <Video title={name} src={src} controls />
        </Box>
      </Box>
    );
  }
);
