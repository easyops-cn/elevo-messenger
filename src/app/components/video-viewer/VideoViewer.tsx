import React from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { Video } from '../media/Video';
import * as css from './VideoViewer.css';
import { downloadMedia } from '../../utils/matrix';
import { saveFile } from '../../utils/file-saver';

export type VideoViewerProps = {
  name: string;
  src: string;
  requestClose: () => void;
};

export const VideoViewer = as<'div', VideoViewerProps>(
  ({ className, name, src, requestClose, ...props }, ref) => {
    const { t } = useTranslation();

    const handleDownload = async () => {
      const fileContent = await downloadMedia(src);
      await saveFile(fileContent, name);
    };

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
              variant="Primary"
              onClick={handleDownload}
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
          <Video
            title={name}
            src={src}
            controls
          />
        </Box>
      </Box>
    );
  }
);
