import React from 'react';
import classNames from 'classnames';
import { Box, Button, Header, Icon, IconButton, Icons, Spinner, Text, as, config } from 'folds';
import { useTranslation } from 'react-i18next';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMediaDownload } from '../../hooks/useMediaDownload';
import { bytesToSize, getFileTypeIcon } from '../../utils/common';
import * as css from './UnknownFileViewer.css';

export type UnknownFileViewerProps = {
  name: string;
  size: number;
  url: string;
  mimetype: string;
  encInfo?: EncryptedAttachmentInfo;
  requestClose: () => void;
};

export const UnknownFileViewer = as<'div', UnknownFileViewerProps>(
  ({ className, name, size, url, mimetype, encInfo, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const [downloadState, handleDownload] = useMediaDownload(url, mimetype, name, encInfo);

    const downloading = downloadState.status === 'loading';

    return (
      <Box className={classNames(css.UnknownFileViewer, className)} direction="Column" {...props} ref={ref}>
        <Header className={css.UnknownFileViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            <IconButton size="300" radii="300" onClick={requestClose}>
              <Icon size="50" src={Icons.ArrowLeft} />
            </IconButton>
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
        </Header>
        <Box grow="Yes" direction="Column" alignItems="Center" justifyContent="Center" gap="200">
          <Icon size="600" src={getFileTypeIcon(mimetype, true)} />
          <Text size="T200" priority="300" truncate>
            {name}
          </Text>
          <Text size="T200" priority="300">{bytesToSize(size)}</Text>
          <Text size="T300">{t('viewer.noPreview')}</Text>
          <Button
            variant="Primary"
            fill="Solid"
            size="400"
            radii="300"
            onClick={handleDownload}
            disabled={downloading}
            before={downloading ? <Spinner size="100" /> : <Icon size="200" src={Icons.Download} />}
            style={{ marginTop: config.space.S400 }}
          >
            <Text size="T300">{t('viewer.download')}</Text>
          </Button>
        </Box>
      </Box>
    );
  }
);
