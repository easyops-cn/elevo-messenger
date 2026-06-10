import { style } from '@vanilla-extract/css';

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
