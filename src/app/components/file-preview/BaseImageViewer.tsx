import React from 'react';
import classNames from 'classnames';
import { Box, Chip, Header, Icon, IconButton, Icons, Text, as } from 'folds';
import { useTranslation } from 'react-i18next';
import { usePan } from '../../hooks/usePan';
import { useZoom } from '../../hooks/useZoom';
import * as css from '../image-viewer/ImageViewer.css';

export type BaseImageViewerProps = {
  alt: string;
  src: string;
  hideCloseButton?: boolean;
  requestClose: () => void;
  onDownload: () => Promise<void>;
};

export const BaseImageViewer = as<'div', BaseImageViewerProps>(
  ({ className, alt, src, hideCloseButton, requestClose, onDownload, ...props }, ref) => {
    const { t } = useTranslation();
    const { zoom, zoomIn, zoomOut, setZoom } = useZoom(0.2);
    const { pan, cursor, onMouseDown } = usePan(zoom !== 1);

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
