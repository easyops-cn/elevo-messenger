import React, {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Editor } from 'slate';
import { Box, config, MenuItem, Text } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useCommands } from '../../hooks/useCommands';
import {
  AutocompleteMenu,
  AutocompleteQuery,
  createCommandElement,
  moveCursor,
  replaceWithElement,
  useActiveAutocompleteItemScroll,
} from '../../components/editor';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../hooks/useAsyncSearch';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useKeyDown } from '../../hooks/useKeyDown';
import { onAutocompleteItemKeyDown, onAutocompleteNavigation } from '../../utils/keyboard';

type CommandAutoCompleteHandler = (commandName: string) => void;

type CommandAutocompleteProps = {
  room: Room;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
};

export function CommandAutocomplete({
  room,
  editor,
  query,
  requestClose,
}: CommandAutocompleteProps) {
  const mx = useMatrixClient();
  const commands = useCommands(mx, room);
  const commandNames = useMemo(() => Object.keys(commands), [commands]);

  const [result, search, resetSearch] = useAsyncSearch(
    commandNames,
    useCallback((commandName: string) => commandName, []),
    SEARCH_OPTIONS,
  );

  const autoCompleteNames = result ? result.items : commandNames;
  const [activeIndex, setActiveIndex] = useState(0);
  const registerItemRef = useActiveAutocompleteItemScroll<HTMLButtonElement>(
    activeIndex,
    autoCompleteNames.length,
  );

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query.text, autoCompleteNames.length]);

  const handleAutocomplete: CommandAutoCompleteHandler = (commandName) => {
    const cmdEl = createCommandElement(commandName);
    replaceWithElement(editor, query.range, cmdEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(
    window,
    (evt: KeyboardEvent) => {
      onAutocompleteNavigation(evt, autoCompleteNames.length, activeIndex, setActiveIndex, () => {
        const cmdName = autoCompleteNames[activeIndex];
        if (cmdName) handleAutocomplete(cmdName);
      });
    },
    true,
  );

  return autoCompleteNames.length === 0 ? null : (
    <AutocompleteMenu
      headerContent={
        <Box grow="Yes" direction="Row" gap="200" justifyContent="SpaceBetween">
          <Text size="L400">Commands</Text>
        </Box>
      }
      requestClose={requestClose}
    >
      {autoCompleteNames.map((commandName, index) => (
        <MenuItem
          key={commandName}
          as="button"
          ref={registerItemRef(index)}
          radii="300"
          style={{ height: 'unset' }}
          aria-selected={activeIndex === index}
          onMouseEnter={() => setActiveIndex(index)}
          onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
            onAutocompleteItemKeyDown(evt, () => handleAutocomplete(commandName))
          }
          onClick={() => handleAutocomplete(commandName)}
        >
          <Box
            style={{ padding: `${config.space.S300} 0` }}
            grow="Yes"
            direction="Column"
            gap="100"
            justifyContent="SpaceBetween"
          >
            <Text style={{ flexGrow: 1 }} size="B400" truncate>
              {`/${commandName}`}
            </Text>
            <Text truncate priority="300" size="T200">
              {commands[commandName].description}
            </Text>
          </Box>
        </MenuItem>
      ))}
    </AutocompleteMenu>
  );
}
