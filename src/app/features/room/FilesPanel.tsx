import React, { useState } from 'react';
import { Box, Chip, Spinner, Text, config } from 'folds';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as css from './RoomSidePanel.css';
import { FileMenuItem } from './FileMenuItem';
import {
  createDesktopPreviewPayload,
  getFileViewerInfo,
  FileViewerOverlay,
} from './FileViewerOverlay';
import { useRoomFiles } from '../../hooks/useRoomFiles';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import { openDesktopFilePreview } from '../../utils/desktopPreview';

type FilesPanelProps = {
  room: Room;
};

export function FilesPanel({ room }: FilesPanelProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();
  const [viewingFile, setViewingFile] = useState<MatrixEvent | null>(null);

  const { files, loading, error, retry } = useRoomFiles(room);
  const isSpaceRoom = room.isSpaceRoom();
  const handleOpenFile = async (fileEvent: MatrixEvent) => {
    const { url } = getFileViewerInfo(fileEvent);
    const mediaUrl = url ? mxcUrlToHttp(mx, url, useAuth) : undefined;

    if (
      mediaUrl &&
      (await openDesktopFilePreview(createDesktopPreviewPayload(fileEvent, mediaUrl)))
    ) {
      return;
    }

    setViewingFile(fileEvent);
  };

  if (isSpaceRoom) return null;

  if (!loading && !error && files.length === 0) return null;

  return (
    <>
      <Box direction="Column" gap="100">
        <Text className={css.MembersGroupLabel} size="L400" priority="300">
          {t('room.files')}
        </Text>

        {loading && (
          <Box justifyContent="Center" style={{ padding: config.space.S200 }}>
            <Spinner />
          </Box>
        )}

        {!loading && error && (
          <Box
            direction="Column"
            alignItems="Center"
            gap="100"
            style={{ padding: config.space.S300 }}
          >
            <Text align="Center" size="T300" priority="300">
              {t('room.filesLoadFailed')}
            </Text>
            <Chip as="button" variant="SurfaceVariant" size="400" radii="300" onClick={retry}>
              <Text size="T200">{t('common.retry')}</Text>
            </Chip>
          </Box>
        )}

        {!loading && !error && files.length > 0 && (
          <Box direction="Column" gap="100">
            {files.map((fileEvent) => (
              <FileMenuItem
                key={fileEvent.getId()}
                fileEvent={fileEvent}
                onClick={() => handleOpenFile(fileEvent)}
              />
            ))}
          </Box>
        )}
      </Box>

      {viewingFile && (
        <FileViewerOverlay fileEvent={viewingFile} requestClose={() => setViewingFile(null)} />
      )}
    </>
  );
}
