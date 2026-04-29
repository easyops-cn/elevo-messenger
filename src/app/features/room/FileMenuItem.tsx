import React, { MouseEventHandler } from 'react';
import type { MatrixEvent } from 'matrix-js-sdk';
import { Icon, MenuItem, Text, config, toRem } from 'folds';
import { getFileTypeIcon } from '../../utils/common';
import { RelativeTime } from '../../components/RelativeTime';

type FileMenuItemProps = {
  fileEvent: MatrixEvent;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function FileMenuItem({
  fileEvent,
  onClick,
}: FileMenuItemProps) {
  const content = fileEvent.getContent();
  const filename = content.filename ?? content.body ?? 'Unnamed File';
  const mimetype = content.info?.mimetype ?? '';
  const icon = getFileTypeIcon(mimetype);
  const eventTs = fileEvent.getTs();

  return (
    <MenuItem
      data-event-id={fileEvent.getId()}
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
