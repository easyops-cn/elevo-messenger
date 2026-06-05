import React, {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Editor } from 'slate';
import { Avatar, Icon, MenuItem, Text } from 'folds';
import { JoinRule, MatrixClient } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';

import { createMentionElement, moveCursor, replaceWithElement } from '../utils';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../../utils/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { getMxIdServer, isRoomAlias } from '../../../utils/matrix';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onAutocompleteItemKeyDown, onAutocompleteNavigation } from '../../../utils/keyboard';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { factoryRoomIdByActivity } from '../../../utils/sort';
import { RoomAvatar, RoomIcon } from '../../room-avatar';
import { getViaServers } from '../../../plugins/via-servers';
import { HashIcon } from '../../../icons/HashIcon';

type MentionAutoCompleteHandler = (roomAliasOrId: string, name: string) => void;

const roomAliasFromQueryText = (mx: MatrixClient, text: string) =>
  isRoomAlias(`#${text}`)
    ? `#${text}`
    : `#${text}${text.endsWith(':') ? '' : ':'}${getMxIdServer(mx.getUserId() ?? '')}`;

function UnknownRoomMentionItem({
  query,
  handleAutocomplete,
  selected,
  onMouseEnter,
}: {
  query: AutocompleteQuery<string>;
  handleAutocomplete: MentionAutoCompleteHandler;
  selected: boolean;
  onMouseEnter: () => void;
}) {
  const mx = useMatrixClient();
  const roomAlias: string = roomAliasFromQueryText(mx, query.text);

  const handleSelect = () => handleAutocomplete(roomAlias, roomAlias);

  return (
    <MenuItem
      as="button"
      radii="300"
      aria-selected={selected}
      onMouseEnter={onMouseEnter}
      onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
        onAutocompleteItemKeyDown(evt, handleSelect)
      }
      onClick={handleSelect}
      before={
        <Avatar size="200">
          <Icon src={HashIcon} size="100" />
        </Avatar>
      }
    >
      <Text style={{ flexGrow: 1 }} size="B400">
        {roomAlias}
      </Text>
    </MenuItem>
  );
}

type RoomMentionAutocompleteProps = {
  roomId: string;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
};

export function RoomMentionAutocomplete({
  roomId,
  editor,
  query,
  requestClose,
}: RoomMentionAutocompleteProps) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);

  const allRooms = useAtomValue(allRoomsAtom).sort(factoryRoomIdByActivity(mx));

  const [result, search, resetSearch] = useAsyncSearch(
    allRooms,
    useCallback(
      (rId) => {
        const r = mx.getRoom(rId);
        if (!r) return 'Unknown Room';
        const alias = r.getCanonicalAlias();
        if (alias) return [r.name, alias];
        return r.name;
      },
      [mx],
    ),
    SEARCH_OPTIONS,
  );

  const autoCompleteRoomIds = result ? result.items.slice(0, 20) : allRooms.slice(0, 20);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoCompleteRooms = useMemo(
    () =>
      autoCompleteRoomIds.flatMap((rId) => {
        const room = mx.getRoom(rId);
        return room ? [room] : [];
      }),
    [mx, autoCompleteRoomIds],
  );
  const itemCount = autoCompleteRooms.length || 1;

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query.text, itemCount]);

  const handleAutocomplete: MentionAutoCompleteHandler = (roomAliasOrId, name) => {
    const mentionRoom = mx.getRoom(roomAliasOrId);
    const viaServers = mentionRoom ? getViaServers(mentionRoom) : undefined;
    const mentionEl = createMentionElement(
      roomAliasOrId,
      name.startsWith('#') ? name : `#${name}`,
      roomId === roomAliasOrId || mx.getRoom(roomId)?.getCanonicalAlias() === roomAliasOrId,
      undefined,
      viaServers,
    );
    replaceWithElement(editor, query.range, mentionEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onAutocompleteNavigation(evt, itemCount, activeIndex, setActiveIndex, () => {
      if (autoCompleteRooms.length === 0) {
        const alias = roomAliasFromQueryText(mx, query.text);
        handleAutocomplete(alias, alias);
        return;
      }
      const room = autoCompleteRooms[activeIndex];
      if (room) handleAutocomplete(room.getCanonicalAlias() ?? room.roomId, room.name);
    });
  });

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
      {autoCompleteRooms.length === 0 ? (
        <UnknownRoomMentionItem
          query={query}
          handleAutocomplete={handleAutocomplete}
          selected={activeIndex === 0}
          onMouseEnter={() => setActiveIndex(0)}
        />
      ) : (
        autoCompleteRooms.map((room, index) => {
          const dm = mDirects.has(room.roomId);
          const rId = room.roomId;

          const handleSelect = () => handleAutocomplete(room.getCanonicalAlias() ?? rId, room.name);

          return (
            <MenuItem
              key={rId}
              as="button"
              radii="300"
              aria-selected={activeIndex === index}
              onMouseEnter={() => setActiveIndex(index)}
              onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                onAutocompleteItemKeyDown(evt, handleSelect)
              }
              onClick={handleSelect}
              after={
                <Text size="T200" priority="300" truncate>
                  {room.getCanonicalAlias() ?? ''}
                </Text>
              }
              before={
                <Avatar size="200">
                  <RoomAvatar
                    roomId={room.roomId}
                    src={dm ? getDirectRoomAvatarUrl(mx, room) : getRoomAvatarUrl(mx, room, 96)}
                    alt={room.name}
                    fallbackAsIcon={
                      dm ? undefined : (
                        <RoomIcon
                          size="100"
                          joinRule={room.getJoinRule()}
                          roomType={room.getType()}
                        />
                      )
                    }
                    renderFallback={() => (
                      <RoomIcon
                        size="50"
                        joinRule={room.getJoinRule() ?? JoinRule.Restricted}
                        roomType={room.getType()}
                        filled
                      />
                    )}
                  />
                </Avatar>
              }
            >
              <Text style={{ flexGrow: 1 }} size="B400" truncate>
                {room.name}
              </Text>
            </MenuItem>
          );
        })
      )}
    </AutocompleteMenu>
  );
}
