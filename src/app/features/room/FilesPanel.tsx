import React, { useState } from 'react';
import { Box, Chip, Spinner, Text, config } from 'folds';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';

import * as css from './RoomSidePanel.css';
import { FileMenuItem } from './FileMenuItem';
import { FileViewerOverlay } from './FileViewerOverlay';
import { useRoomFiles } from '../../hooks/useRoomFiles';

type FilesPanelProps = {
  room: Room;
};

export function FilesPanel({ room }: FilesPanelProps) {
  const { t } = useTranslation();
  const [viewingFile, setViewingFile] = useState<MatrixEvent | null>(null);

  const { files, loading, error, retry } = useRoomFiles(room);
  const isSpaceRoom = room.isSpaceRoom();

  if (isSpaceRoom) return null;

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

        {!loading && !error && files.length === 0 && (
          <Text style={{ padding: config.space.S300 }} align="Center" size="T200" priority="300">
            {t('room.noFiles')}
          </Text>
        )}

        {!loading && !error && files.length > 0 && (
          <Box direction="Column" gap="100">
            {files.map((fileEvent) => (
              <FileMenuItem
                key={fileEvent.getId()}
                fileEvent={fileEvent}
                onClick={() => setViewingFile(fileEvent)}
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
