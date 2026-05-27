import React from 'react';
import classNames from 'classnames';
import { Box, Button, Header, Icon, IconButton, Icons, Spinner, Text, as, config } from 'folds';
import { useTranslation } from 'react-i18next';
import { bytesToSize, getFileTypeIcon, secondsToMinutesAndSeconds } from '../../utils/common';
import * as css from '../unknown-file-viewer/UnknownFileViewer.css';

export type BaseUnknownFileViewerProps = {
  name: string;
  size?: number;
  mimeType: string;
  duration?: number;
  hideCloseButton?: boolean;
  downloading?: boolean;
  requestClose: () => void;
  onDownload: () => Promise<void>;
};

export const BaseUnknownFileViewer = as<'div', BaseUnknownFileViewerProps>(
  (
    {
      className,
      name,
      size,
      mimeType,
      duration,
      hideCloseButton,
      downloading,
      requestClose,
      onDownload,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();

    return (
      <Box
        className={classNames(css.UnknownFileViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.UnknownFileViewerHeader} size="400">
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
        </Header>
        <Box grow="Yes" direction="Column" alignItems="Center" justifyContent="Center" gap="200">
          <Icon size="600" src={getFileTypeIcon(mimeType, true)} />
          <Text size="T200" priority="300" truncate>
            {name}
          </Text>
          {size ? (
            <Text size="T200" priority="300">
              {bytesToSize(size)}
            </Text>
          ) : null}
          {duration ? (
            <Text size="T200" priority="300">
              {secondsToMinutesAndSeconds(duration / 1000)}
            </Text>
          ) : null}
          <Text size="T300">{t('viewer.noPreview')}</Text>
          <Button
            variant="Primary"
            fill="Solid"
            size="400"
            radii="300"
            onClick={onDownload}
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
