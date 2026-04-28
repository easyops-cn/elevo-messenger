import React, { CSSProperties } from 'react';
import { Badge, Box, Text } from 'folds';
import { EmojiBoardTab } from '../types';

const styles: CSSProperties = {
  cursor: 'pointer',
};

export function EmojiBoardTabs({
  tab,
  onTabChange,
  allowSticker = true,
}: {
  tab: EmojiBoardTab;
  allowSticker?: boolean;
  onTabChange: (tab: EmojiBoardTab) => void;
}) {
  return (
    <Box gap="100">
      {allowSticker && <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Sticker ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Sticker)}
      >
        <Text as="span" size="L400">
          Sticker
        </Text>
      </Badge>}
      <Badge
        style={styles}
        as="button"
        variant="Secondary"
        fill={tab === EmojiBoardTab.Emoji ? 'Solid' : 'None'}
        size="500"
        onClick={() => onTabChange(EmojiBoardTab.Emoji)}
      >
        <Text as="span" size="L400">
          Emoji
        </Text>
      </Badge>
    </Box>
  );
}
