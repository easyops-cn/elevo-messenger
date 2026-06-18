import React from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { saveFile } from '../../utils/file-saver';
import * as css from './ImageViewer.css';
import { useZoom } from '../../hooks/useZoom';
import { usePan } from '../../hooks/usePan';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { downloadMedia } from '../../utils/matrix';

export type ImageViewerProps = {
  alt: string;
  src: string;
  hideCloseButton?: boolean;
  onDownload?: () => Promise<void>;
  requestClose: () => void;
};

export const ImageViewer = as<'div', ImageViewerProps>(
  ({ className, alt, src, hideCloseButton, onDownload, requestClose, ...props }, ref) => {
    const { t } = useTranslation();
    const mx = useMatrixClient();
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);
    const { pan, cursor, onMouseDown } = usePan(zoom !== 1);

    const handleDownload = async () => {
      if (onDownload) {
        await onDownload();
        return;
      }
      const fileContent = await downloadMedia(src, mx);
      await saveFile(fileContent, alt);
    };

    return (
      <Box
        className={classNames(css.ImageViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.ImageViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            {!hideCloseButton && (
              <IconButton size="300" radii="300" onClick={requestClose}>
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate>
              {alt}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <IconButton
              variant={zoom < 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom < 1}
              size="300"
              radii="Pill"
              onClick={zoomOut}
              aria-label={t('viewer.zoomOut')}
            >
              <Icon size="50" src={Icons.Minus} />
            </IconButton>
            <Chip variant="SurfaceVariant" radii="Pill" onClick={() => setZoom(zoom === 1 ? 2 : 1)}>
              <Text size="B300">{Math.round(zoom * 100)}%</Text>
            </Chip>
            <IconButton
              variant={zoom > 1 ? 'Success' : 'SurfaceVariant'}
              outlined={zoom > 1}
              size="300"
              radii="Pill"
              onClick={zoomIn}
              aria-label={t('viewer.zoomIn')}
            >
              <Icon size="50" src={Icons.Plus} />
            </IconButton>
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
          className={css.ImageViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <img
            className={css.ImageViewerImg}
            style={{
              cursor,
              transform: `scale(${zoom}) translate(${pan.translateX}px, ${pan.translateY}px)`,
            }}
            src={src}
            alt={alt}
            onMouseDown={onMouseDown}
          />
        </Box>
      </Box>
    );
  },
);
