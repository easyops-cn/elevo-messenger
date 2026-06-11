import { style } from '@vanilla-extract/css';
import { color } from 'folds';

export const ThreadTitle = style({
  minWidth: 0,
});

export const ThreadHeader = style({});

export const ThreadTopicEditButton = style({
  opacity: 0,
  selectors: {
    [`${ThreadHeader}:hover &`]: {
      opacity: 1,
    },
    '&:focus-visible': {
      opacity: 1,
    },
  },
});

export const ThreadStarButton = style({
  opacity: 0,
  selectors: {
    [`${ThreadHeader}:hover &`]: {
      opacity: 1,
    },
    '&:focus-visible': {
      opacity: 1,
    },
  },
});

export const ThreadStarButtonActive = style({
  opacity: 1,
  color: color.Warning.Main,
});
