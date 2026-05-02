import {
  Box,
  Button,
  color,
  config,
  Icon,
  Icons,
  Input,
  Menu,
  MenuItem,
  Scroll,
  Spinner,
  Switch,
  Text,
  toRem,
} from 'folds';
import React, { ChangeEventHandler, FormEventHandler, KeyboardEventHandler, useCallback, useMemo, useRef, useState } from 'react';
import { isKeyHotkey } from 'is-hotkey';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { ICreateRoomStateEvent, MatrixError, Preset, Visibility } from 'matrix-js-sdk';
import { useNavigate } from 'react-router-dom';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import { addRoomIdToMDirect, getDMRoomFor, getMxIdLocalPart, getMxIdServer, isUserId } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ErrorCode } from '../../cs-errorcode';
import { millisecondsToMinutes } from '../../utils/common';
import { createRoomEncryptionState } from '../../components/create-room';
import { useAlive } from '../../hooks/useAlive';
import { getHomeRoomPath } from '../../pages/pathUtils';
import { useElevoConfig } from '../../hooks/useElevoConfig';
import { useDirectUsers } from '../../hooks/useDirectUsers';
import { useAsyncSearch, UseAsyncSearchOptions } from '../../hooks/useAsyncSearch';
import { highlightText, makeHighlightRegex } from '../../plugins/react-custom-html-parser';
import { stopPropagation } from '../../utils/keyboard';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

type CreateChatProps = {
  defaultUserId?: string;
};
export function CreateChat({ defaultUserId }: CreateChatProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const alive = useAlive();
  const navigate = useNavigate();
  const elevoConfig = useElevoConfig();
  const encryptionEnabled = elevoConfig.features.encryption;

  const [encryption, setEncryption] = useState(encryptionEnabled);
  const [invalidUserId, setInvalidUserId] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const directUsers = useDirectUsers();
  const directs = useDirectRooms();
  const { elevoContactsRoomId } = elevoConfig;

  const contactsMembers = useRoomMembers(mx, elevoContactsRoomId);

  const contactsMembersMap = useMemo(() => new Map(
    contactsMembers.map((m) => [m.userId, m.name])
  ), [contactsMembers]);

  const knownUsers = useMemo(
    () =>
      [...new Set([...directUsers, ...contactsMembersMap.keys()])].filter(
        (userId) => userId !== mx.getUserId()
      ),
    [directUsers, contactsMembersMap, mx]
  );

  const getSearchStr = useCallback(
    (userId: string) => {
      const localPart = getMxIdLocalPart(userId) ?? userId;
      const displayName = contactsMembersMap.get(userId);
      return displayName ? [localPart, displayName] : localPart;
    },
    [contactsMembersMap]
  );

  const [result, search, resetSearch] = useAsyncSearch(
    knownUsers,
    getSearchStr,
    SEARCH_OPTIONS
  );

  const queryHighlighRegex = result?.query
    ? makeHighlightRegex(result.query.split(' '))
    : undefined;

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const value = evt.currentTarget.value.trim();
    if (isUserId(value)) {
      resetSearch();
    } else {
      const term = getMxIdLocalPart(value) ?? (value.startsWith('@') ? value.slice(1) : value);
      if (term) {
        search(term);
      } else {
        resetSearch();
      }
    }
  };

  const handleUserId = (userId: string) => {
    if (inputRef.current) {
      inputRef.current.value = userId;
      resetSearch();
      inputRef.current.focus();
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      resetSearch();
      return;
    }
    if (isKeyHotkey('tab', evt) && result && result.items.length > 0) {
      evt.preventDefault();
      handleUserId(result.items[0]);
    }
  };

  const [createState, create] = useAsyncCallback<string, Error | MatrixError, [string, boolean]>(
    useCallback(
      async (userId, encrypted) => {
        const initialState: ICreateRoomStateEvent[] = [];

        if (encrypted) initialState.push(createRoomEncryptionState());

        const createResult = await mx.createRoom({
          is_direct: true,
          invite: [userId],
          visibility: Visibility.Private,
          preset: Preset.TrustedPrivateChat,
          initial_state: initialState,
        });

        addRoomIdToMDirect(mx, createResult.room_id, userId);

        return createResult.room_id;
      },
      [mx]
    )
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const disabled = createState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    setInvalidUserId(false);

    const target = evt.target as HTMLFormElement | undefined;
    const userIdInput = target?.userIdInput as HTMLInputElement | undefined;
    const userId = userIdInput?.value.trim();

    if (!userIdInput || !userId) return;
    if (!isUserId(userId)) {
      setInvalidUserId(true);
      return;
    }

    // 检查是否已有 DM room，如有则直接跳转
    const existingRoom = getDMRoomFor(mx, userId);
    if (existingRoom?.roomId && directs.includes(existingRoom.roomId)) {
      userIdInput.value = '';
      navigate(getHomeRoomPath(existingRoom.roomId));
      return;
    }

    create(userId, encryptionEnabled ? encryption : false).then((roomId) => {
      if (alive()) {
        userIdInput.value = '';
        navigate(getHomeRoomPath(roomId));
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">{t('dialog.userId')}</Text>
        <div>
          <Input
            ref={inputRef}
            defaultValue={defaultUserId}
            placeholder={t('dialog.userIdPlaceholder')}
            name="userIdInput"
            variant="SurfaceVariant"
            size="500"
            radii="400"
            required
            autoFocus
            autoComplete="off"
            disabled={disabled}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
          />
          {result && result.items.length > 0 && (
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: resetSearch,
                returnFocusOnDeactivate: false,
                clickOutsideDeactivates: true,
                allowOutsideClick: true,
                isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
                isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
                escapeDeactivates: stopPropagation,
              }}
            >
              <Box style={{ position: 'relative' }}>
                <Menu style={{ position: 'absolute', top: 0, zIndex: 1, width: '100%' }}>
                  <Scroll hideTrack size="300" style={{ maxHeight: toRem(100) }}>
                    <div style={{ padding: config.space.S100 }}>
                      {result.items.map((userId) => {
                        const username = `${getMxIdLocalPart(userId)}`;
                        const userServer = getMxIdServer(userId);
                        const displayName = contactsMembersMap.get(userId);

                        return (
                          <MenuItem
                            key={userId}
                            type="button"
                            size="300"
                            variant="Surface"
                            radii="300"
                            onClick={() => handleUserId(userId)}
                            after={
                              <Text size="T200" truncate>
                                {userServer}
                              </Text>
                            }
                            disabled={disabled}
                          >
                            <Box grow="Yes">
                              <Text size="T300" truncate>
                                <b>
                                  {displayName && (
                                    <>
                                      (
                                      {queryHighlighRegex
                                        ? highlightText(queryHighlighRegex, [displayName])
                                        : displayName}
                                      {') '}
                                    </>
                                  )}
                                  {queryHighlighRegex
                                    ? highlightText(queryHighlighRegex, [username ?? userId])
                                    : username}
                                </b>
                              </Text>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </div>
                  </Scroll>
                </Menu>
              </Box>
            </FocusTrap>
          )}
        </div>
        {invalidUserId && (
          <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
            <Icon src={Icons.Warning} filled size="50" />
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>{t('create.invalidUserId')}</b>
            </Text>
          </Box>
        )}
      </Box>
      {encryptionEnabled && (
        <Box shrink="No" direction="Column" gap="100">
          <Text size="L400">{t('create.options')}</Text>
          <SequenceCard
            style={{ padding: config.space.S300 }}
            variant="SurfaceVariant"
            direction="Column"
            gap="500"
          >
            <SettingTile
              title={t('create.endToEndEncryption')}
              description={t('create.encryptionRoomDesc')}
              after={
                <Switch
                  variant="Primary"
                  value={encryption}
                  onChange={setEncryption}
                  disabled={disabled}
                />
              }
            />
          </SequenceCard>
        </Box>
      )}
      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          <Icon src={Icons.Warning} filled size="100" />
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>
              {error instanceof MatrixError && error.name === ErrorCode.M_LIMIT_EXCEEDED
                ? t('create.rateLimited', {
                    minutes: millisecondsToMinutes(
                      (error.data.retry_after_ms as number | undefined) ?? 0
                    ),
                  })
                : error.message}
            </b>
          </Text>
        </Box>
      )}
      <Box shrink="No" direction="Column" gap="200">
        <Button
          type="submit"
          size="500"
          variant="Primary"
          radii="400"
          disabled={disabled}
          before={loading && <Spinner variant="Primary" fill="Solid" size="200" />}
        >
          <Text size="B500">{t('create.go')}</Text>
        </Button>
      </Box>
    </Box>
  );
}
