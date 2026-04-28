import React, { useRef } from 'react';
import { Box, Scroll } from 'folds';
import { Room } from 'matrix-js-sdk';
import classNames from 'classnames';

import * as css from './RoomSidePanel.css';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { MembersPanel } from './MembersPanel';
import { FilesPanel } from './FilesPanel';
import { ThreadsPanel } from './ThreadsPanel';

type RoomSidePanelProps = {
  room: Room;
};
export function RoomSidePanel({ room }: RoomSidePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSpaceRoom = room.isSpaceRoom();

  return (
    <Box
      className={classNames(css.RoomSidePanel, ContainerColor({ variant: 'Background' }))}
      shrink="No"
      direction="Column"
    >
      <Box className={css.MemberDrawerContentBase} grow="Yes">
        <Scroll ref={scrollRef} variant="Background" size="300" visibility="Hover" hideTrack>
          <Box className={css.MemberDrawerContent} direction="Column" gap="600">
            <MembersPanel room={room} />
            <FilesPanel room={room} />
            {!isSpaceRoom && <ThreadsPanel room={room} />}
          </Box>
        </Scroll>
      </Box>
    </Box>
  );
}
