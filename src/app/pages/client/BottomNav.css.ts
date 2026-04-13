import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, Disabled, FocusOutline, toRem } from 'folds';

export const BottomNavContainer = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: config.space.S100,
    padding: `${config.space.S200} ${config.space.S100}`,
    borderTop: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    flexShrink: 0,
  },
]);

const INDICATOR_HEIGHT = 3;
const INDICATOR_RADIUS = 2;
export const BottomNavItem = recipe({
  base: [
    DefaultReset,
    Disabled,
    FocusOutline,
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: toRem(36),
      height: toRem(36),
      borderRadius: config.radii.R400,
      cursor: 'pointer',
      transition: 'background-color 200ms',

      selectors: {
        '&:hover': {
          backgroundColor: color.Background.ContainerHover,
        },
        '&:active': {
          backgroundColor: color.Background.ContainerActive,
        },
        '&::after': {
          content: '',
          display: 'none',
          position: 'absolute',
          bottom: toRem(-4),
          left: '50%',
          transform: 'translateX(-50%)',
          width: toRem(INDICATOR_RADIUS * 2 + INDICATOR_HEIGHT),
          height: toRem(INDICATOR_HEIGHT),
          borderRadius: config.radii.R400,
          background: 'CurrentColor',
        },
      },
    },
  ],
  variants: {
    active: {
      true: {
        color: color.Primary.Main,
        selectors: {
          '&::after': {
            display: 'block',
          },
        },
      },
    },
  },
});
export type BottomNavItemVariants = RecipeVariants<typeof BottomNavItem>;

export const BottomNavItemBadge = style([
  DefaultReset,
  {
    pointerEvents: 'none',
    position: 'absolute',
    zIndex: 1,
    top: toRem(-2),
    right: toRem(-2),
    lineHeight: 0,
  },
]);
