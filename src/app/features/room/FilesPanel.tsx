import React, { useState } from 'react';
import { Box, Chip, Spinner, Text, config } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as css from './RoomSidePanel.css';
import { FileMenuItem } from './FileMenuItem';
import { createDesktopPreviewPayloadFromEntry, RoomMediaViewerOverlay } from './FileViewerOverlay';
import { useRoomFiles } from '../../hooks/useRoomFiles';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { mxcUrlToHttp } from '../../utils/matrix';
import { openDesktopFilePreview } from '../../utils/desktopPreview';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import type { RoomMediaEntry } from '../../utils/roomMediaIndex';

type FilesPanelProps = {
  room: Room;
};

const FILES_PANEL_VISIBLE_LIMIT = 10;

export function FilesPanel({ room }: FilesPanelProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();
  const [viewingFile, setViewingFile] = useState<{ file: RoomMediaEntry; mediaUrl: string } | null>(
    null,
  );

  const { files, loading, error, retry } = useRoomFiles(room, FILES_PANEL_VISIBLE_LIMIT + 1);
  const visibleFiles = files.slice(0, FILES_PANEL_VISIBLE_LIMIT);
  const hasMoreFiles = files.length > FILES_PANEL_VISIBLE_LIMIT;
  const isSpaceRoom = room.isSpaceRoom();
  const handleOpenFile = async (file: RoomMediaEntry) => {
    const mediaUrl = mxcUrlToHttp(mx, file.mediaMxc, useAuth);

    if (
      mediaUrl &&
      (await openDesktopFilePreview(createDesktopPreviewPayloadFromEntry(file, mediaUrl)))
    ) {
      return;
    }

    if (mediaUrl) {
      setViewingFile({ file, mediaUrl });
    }
  };

  if (!isDesktopTauri || isSpaceRoom) return null;

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
            {visibleFiles.map((fileEvent) => (
              <FileMenuItem
                key={fileEvent.eventId}
                file={fileEvent}
                onClick={() => handleOpenFile(fileEvent)}
              />
            ))}
            {hasMoreFiles && (
              <Text align="Center" size="T200" priority="300">
                {t('room.filesLimited', { count: FILES_PANEL_VISIBLE_LIMIT })}
              </Text>
            )}
          </Box>
        )}
      </Box>

      {viewingFile && (
        <RoomMediaViewerOverlay
          file={viewingFile.file}
          mediaUrl={viewingFile.mediaUrl}
          requestClose={() => setViewingFile(null)}
        />
      )}
    </>
  );
}
