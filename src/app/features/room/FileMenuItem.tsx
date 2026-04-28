import React, { MouseEventHandler, useMemo } from 'react';
import type { MatrixEvent } from 'matrix-js-sdk';
import { Icon, Icons, MenuItem, Text, config, toRem } from 'folds';
import { bytesToSize, getFileTypeIcon } from '../../utils/common';

type FileMenuItemProps = {
  fileEvent: MatrixEvent;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function FileMenuItem({ fileEvent, onClick }: FileMenuItemProps) {
  const content = fileEvent.getContent();
  const filename = content.filename ?? content.body ?? 'Unnamed File';
  const size = content.info?.size;
  const mimetype = content.info?.mimetype ?? '';

  const icon = useMemo(() => getFileTypeIcon(Icons, mimetype), [mimetype]);

  return (
    <MenuItem
      data-event-id={fileEvent.getId()}
      style={{ padding: `0 ${config.space.S200}`, height: toRem(32) }}
      variant="Background"
      radii="400"
      onClick={onClick}
      before={<Icon size="200" src={icon} />}
      after={
        size ? (
          <Text size="T200" priority="300" style={{ flexShrink: 0 }}>
            {bytesToSize(size)}
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
