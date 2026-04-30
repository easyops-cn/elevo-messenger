import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, config, toRem } from 'folds';
import { MOBILE_BREAKPOINT } from '../../../hooks/useScreenSize';

export const MessageBase = style({
  position: 'relative',
});
export const MessageBaseBubbleCollapsed = style({
  paddingTop: 0,
});
export const MessageBaseNonCompact = recipe({
  variants: {
    isOwn: {
      true: {
        paddingLeft: 56,
        '@media': {
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            paddingLeft: 16,
          },
        },
      },
      false: {
        paddingRight: 56,
        '@media': {
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            paddingRight: 16,
          },
        },
      },
    },
  },
  defaultVariants: {
    isOwn: false,
  }
});

export const MessageOptionsBase = style([
  DefaultReset,
  {
    position: 'absolute',
    top: toRem(-30),
    right: 0,
    zIndex: 1,
  },
]);
export const MessageOptionsBar = style([
  DefaultReset,
  {
    padding: config.space.S100,
  },
]);

export const BubbleAvatarBase = style({
  paddingTop: 0,
});

export const MessageAvatar = style({
  cursor: 'pointer',
});

export const MessageQuickReaction = style({
  minWidth: toRem(32),
});

export const MessageMenuGroup = style({
  padding: config.space.S100,
});

export const MessageMenuItemText = style({
  flexGrow: 1,
});

export const ReactionsContainer = style({
  selectors: {
    '&:empty': {
      display: 'none',
    },
  },
});

export const ReactionsTooltipText = style({
  wordBreak: 'break-word',
});
