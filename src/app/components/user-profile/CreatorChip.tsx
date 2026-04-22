import { Chip, config, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import React, { MouseEventHandler, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { useTranslation } from 'react-i18next';
import { stopPropagation } from '../../utils/keyboard';
import { useRoom } from '../../hooks/useRoom';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useOpenSpaceSettings } from '../../state/hooks/spaceSettings';
import { SpaceSettingsPage } from '../../state/spaceSettings';
import { RoomSettingsPage } from '../../state/roomSettings';
import { BADGE_LABEL_KEYS } from '../../hooks/usePowerLevelTags';

export function CreatorChip() {
  const { t } = useTranslation();
  const room = useRoom();
  const space = useSpaceOptionally();
  const openRoomSettings = useOpenRoomSettings();
  const openSpaceSettings = useOpenSpaceSettings();

  const [cords, setCords] = useState<RectCords>();

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu>
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  if (room.isSpaceRoom()) {
                    openSpaceSettings(
                      room.roomId,
                      space?.roomId,
                      SpaceSettingsPage.PermissionsPage
                    );
                  } else {
                    openRoomSettings(room.roomId, space?.roomId, RoomSettingsPage.PermissionsPage);
                  }
                  close();
                }}
              >
                <Text size="B300">Manage Powers</Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant="Primary"
        outlined
        radii="Pill"
        before={<Icon size="50" src={Icons.ShieldUser} />}
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300" truncate>
          {t(BADGE_LABEL_KEYS.Creator)}
        </Text>
      </Chip>
    </PopOut>
  );
}
