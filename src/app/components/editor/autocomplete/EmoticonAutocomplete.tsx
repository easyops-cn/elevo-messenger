import React, { KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useState } from 'react';
import { Editor } from 'slate';
import { Box, MenuItem, Text, toRem } from 'folds';
import { Room } from 'matrix-js-sdk';

import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onAutocompleteItemKeyDown, onAutocompleteNavigation } from '../../../utils/keyboard';
import { createEmoticonElement, moveCursor, replaceWithElement } from '../utils';
import { useRecentEmoji } from '../../../hooks/useRecentEmoji';
import { useRelevantImagePacks } from '../../../hooks/useImagePacks';
import { IEmoji, emojis } from '../../../plugins/emoji';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { MxcImg } from '../../MxcImg';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { ImageUsage, PackImageReader } from '../../../plugins/custom-emoji';
import { getEmoticonSearchStr } from '../../../plugins/utils';

type EmoticonCompleteHandler = (key: string, shortcode: string) => void;

type EmoticonSearchItem = PackImageReader | IEmoji;

type EmoticonAutocompleteProps = {
  imagePackRooms: Room[];
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
};

export function EmoticonAutocomplete({
  imagePackRooms,
  editor,
  query,
  requestClose,
}: EmoticonAutocompleteProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const imagePacks = useRelevantImagePacks(ImageUsage.Emoticon, imagePackRooms);
  const recentEmoji = useRecentEmoji(mx, 20);

  const searchList = useMemo(() => {
    const list: Array<EmoticonSearchItem> = [];
    return list.concat(
      imagePacks.flatMap((pack) => pack.getImages(ImageUsage.Emoticon)),
      emojis,
    );
  }, [imagePacks]);

  const [result, search, resetSearch] = useAsyncSearch(
    searchList,
    getEmoticonSearchStr,
    SEARCH_OPTIONS,
  );
  const autoCompleteEmoticon = result ? result.items.slice(0, 20) : recentEmoji;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query.text, autoCompleteEmoticon.length]);

  const handleAutocomplete: EmoticonCompleteHandler = (key, shortcode) => {
    const emoticonEl = createEmoticonElement(key, shortcode);
    replaceWithElement(editor, query.range, emoticonEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onAutocompleteNavigation(evt, autoCompleteEmoticon.length, activeIndex, setActiveIndex, () => {
      const emoticon = autoCompleteEmoticon[activeIndex];
      if (!emoticon) return;
      const key = 'url' in emoticon ? emoticon.url : emoticon.unicode;
      handleAutocomplete(key, emoticon.shortcode);
    });
  });

  return autoCompleteEmoticon.length === 0 ? null : (
    <AutocompleteMenu headerContent={<Text size="L400">Emojis</Text>} requestClose={requestClose}>
      {autoCompleteEmoticon.map((emoticon, index) => {
        const isCustomEmoji = 'url' in emoticon;
        const key = isCustomEmoji ? emoticon.url : emoticon.unicode;
        const customEmojiUrl = mxcUrlToHttp(mx, key, useAuthentication);

        return (
          <MenuItem
            key={emoticon.shortcode + key}
            as="button"
            radii="300"
            aria-selected={activeIndex === index}
            onMouseEnter={() => setActiveIndex(index)}
            onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
              onAutocompleteItemKeyDown(evt, () => handleAutocomplete(key, emoticon.shortcode))
            }
            onClick={() => handleAutocomplete(key, emoticon.shortcode)}
            before={
              isCustomEmoji && customEmojiUrl ? (
                <MxcImg
                  src={customEmojiUrl}
                  alt={emoticon.shortcode}
                  style={{
                    width: toRem(24),
                    height: toRem(24),
                    objectFit: 'contain',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  shrink="No"
                  as="span"
                  display="InlineFlex"
                  style={{ fontSize: toRem(24), lineHeight: toRem(24) }}
                >
                  {key}
                </Box>
              )
            }
          >
            <Text style={{ flexGrow: 1 }} size="B400" truncate>
              :{emoticon.shortcode}:
            </Text>
          </MenuItem>
        );
      })}
    </AutocompleteMenu>
  );
}
