import React, { KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from 'react';
import { Editor, Transforms } from 'slate';
import { MenuItem, Text } from 'folds';

import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { useActiveAutocompleteItemScroll } from './useActiveAutocompleteItemScroll';
import { onAutocompleteItemKeyDown, onAutocompleteNavigation } from '../../../utils/keyboard';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { htmlToEditorInput, plainToEditorInput } from '../input';
import { resetEditor, resetEditorHistory } from '../utils';
import { RecentRoomInputMessage } from './recentRoomInputMessages';

type RecentMessageAutocompleteProps = {
  editor: Editor;
  query: AutocompleteQuery<string>;
  messages: RecentRoomInputMessage[];
  isMarkdown: boolean;
  requestClose: () => void;
};

export function RecentMessageAutocomplete({
  editor,
  query,
  messages,
  isMarkdown,
  requestClose,
}: RecentMessageAutocompleteProps) {
  const autoCompleteMessages = messages.slice(0, 10);
  const itemCount = autoCompleteMessages.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const registerItemRef = useActiveAutocompleteItemScroll<HTMLButtonElement>(
    activeIndex,
    itemCount,
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, itemCount]);

  const handleAutocomplete = (message: RecentRoomInputMessage) => {
    const input =
      message.formattedBody !== undefined
        ? htmlToEditorInput(message.formattedBody, isMarkdown)
        : plainToEditorInput(message.body, isMarkdown);

    resetEditor(editor);
    Transforms.insertFragment(editor, input);
    Transforms.collapse(editor, { edge: 'end' });
    resetEditorHistory(editor);
    requestClose();
  };

  useKeyDown(
    window,
    (evt: KeyboardEvent) => {
      onAutocompleteNavigation(evt, itemCount, activeIndex, setActiveIndex, () => {
        const message = autoCompleteMessages[activeIndex];
        if (message) handleAutocomplete(message);
      });
    },
    true,
  );

  if (itemCount === 0) {
    return null;
  }

  return (
    <AutocompleteMenu
      headerContent={<Text size="L400">Recent Messages</Text>}
      requestClose={requestClose}
    >
      {autoCompleteMessages.map((message, index) => (
        <MenuItem
          key={`${message.body}:${message.formattedBody ?? ''}:${message.updatedAt}`}
          as="button"
          ref={registerItemRef(index)}
          radii="300"
          aria-selected={activeIndex === index}
          onMouseEnter={() => setActiveIndex(index)}
          onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
            onAutocompleteItemKeyDown(evt, () => handleAutocomplete(message))
          }
          onClick={() => handleAutocomplete(message)}
        >
          <Text style={{ flexGrow: 1 }} size="B400" truncate>
            {message.body}
          </Text>
        </MenuItem>
      ))}
    </AutocompleteMenu>
  );
}
