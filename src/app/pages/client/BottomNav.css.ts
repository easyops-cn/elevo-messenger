import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, Disabled, FocusOutline, toRem } from 'folds';
import { elevoColor } from '../../../config.css';

export const BottomNavContainer = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: config.space.S100,
    padding: `${config.space.S100} ${config.space.S300}`,
    margin: `${config.space.S400} ${config.space.S300}`,
    borderRadius: config.radii.Pill,
    background: elevoColor.Background.NavBar,
    color: color.Background.OnContainer,
    flexShrink: 0,
    boxShadow: `${elevoColor.shadow.SpecularHighlight}, ${elevoColor.shadow.NavBar}`,
  },
]);

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
      },
    },
  ],
  variants: {
    active: {
      true: {
        color: color.Primary.Main,
      },
    },
  },
});
export type BottomNavItemVariants = RecipeVariants<typeof BottomNavItem>;

export const BottomNavItemBadge = recipe({
  base: [
    DefaultReset,
    {
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 1,
      top: toRem(-2),
      right: toRem(-2),
      lineHeight: 0,
    },
  ],
  variants: {
    dot: {
      true: {
        top: toRem(2),
        right: toRem(2),
      }
    }
  }
});
