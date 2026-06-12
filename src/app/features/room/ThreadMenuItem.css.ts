import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const ThreadMenuItem = style({
  position: 'relative',
  selectors: {
    '&[aria-selected=true]': {
      backgroundColor: color.Background.ContainerActive,
    },
  },
});

export const ThreadMenuItemButton = style({
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'inherit',
  padding: 0,
  minWidth: 0,
  cursor: 'pointer',
});

export const StarredThreadIcon = style({
  flexShrink: 0,
  color: color.Warning.Main,
});
