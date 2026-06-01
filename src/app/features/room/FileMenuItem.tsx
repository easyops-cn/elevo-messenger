import React, { MouseEventHandler } from 'react';
import { Icon, MenuItem, Text, config, toRem } from 'folds';
import { getFileTypeIcon } from '../../utils/common';
import { RelativeTime } from '../../components/RelativeTime';
import type { RoomMediaEntry } from '../../utils/roomMediaIndex';

type FileMenuItemProps = {
  file: RoomMediaEntry;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function FileMenuItem({ file, onClick }: FileMenuItemProps) {
  const { filename } = file;
  const mimetype = file.mimeType;
  const icon = getFileTypeIcon(mimetype);
  const eventTs = file.eventTs;

  return (
    <MenuItem
      data-event-id={file.eventId}
      style={{ padding: `0 ${config.space.S200}`, height: toRem(32) }}
      variant="Background"
      radii="400"
      onClick={onClick}
      before={<Icon size="200" src={icon} />}
      after={
        eventTs ? (
          <Text size="T200" priority="300" style={{ flexShrink: 0, opacity: 0.5 }}>
            <RelativeTime ts={eventTs} />
          </Text>
        ) : undefined
      }
    >
      <Text size="T300" truncate style={{ flexGrow: 1 }}>
        {filename}
      </Text>
    </MenuItem>
  );
}
