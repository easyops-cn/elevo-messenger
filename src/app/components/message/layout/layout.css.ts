import { createVar, keyframes, style, styleVariants } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';
import { elevoColor } from '../../../../config.css';

export const StickySection = style({
  position: 'sticky',
  top: config.space.S100,
});

const SpacingVar = createVar();
const SpacingVariant = styleVariants({
  '0': {
    vars: {
      [SpacingVar]: config.space.S0,
    },
  },
  '100': {
    vars: {
      [SpacingVar]: config.space.S100,
    },
  },
  '200': {
    vars: {
      [SpacingVar]: config.space.S200,
    },
  },
  '300': {
    vars: {
      [SpacingVar]: config.space.S300,
    },
  },
  '400': {
    vars: {
      [SpacingVar]: config.space.S400,
    },
  },
  '500': {
    vars: {
      [SpacingVar]: config.space.S500,
    },
  },
});

const highlightAnime = keyframes({
  '0%': {
    backgroundColor: color.Primary.Container,
  },
  '25%': {
    backgroundColor: color.Primary.ContainerActive,
  },
  '50%': {
    backgroundColor: color.Primary.Container,
  },
  '75%': {
    backgroundColor: color.Primary.ContainerActive,
  },
  '100%': {
    backgroundColor: color.Primary.Container,
  },
});
const HighlightVariant = styleVariants({
  true: {
    animation: `${highlightAnime} 2000ms ease-in-out`,
    animationIterationCount: 'infinite',
  },
});

const SelectedVariant = styleVariants({
  true: {
    backgroundColor: color.Surface.ContainerActive,
  },
});

const AutoCollapse = style({
  selectors: {
    [`&+&`]: {
      marginTop: 0,
    },
  },
});

export const MessageBase = recipe({
  base: [
    DefaultReset,
    {
      marginTop: SpacingVar,
    },
  ],
  variants: {
    space: SpacingVariant,
    collapse: {
      true: {
        marginTop: 0,
      },
    },
    autoCollapse: {
      true: AutoCollapse,
    },
    highlight: HighlightVariant,
    selected: SelectedVariant,
    own: {
      true: {
        padding: `${config.space.S100} ${config.space.S400} ${config.space.S100} ${config.space.S200}`,
        borderRadius: `${config.radii.R400} 0 0 ${config.radii.R400}`,
      },
      false: {
        padding: `${config.space.S100} ${config.space.S200} ${config.space.S100} ${config.space.S400}`,
        borderRadius: `0 ${config.radii.R400} ${config.radii.R400} 0`,
      },
    },
  },
  defaultVariants: {
    space: '400',
    own: false,
  },
});

export type MessageBaseVariants = RecipeVariants<typeof MessageBase>;

export const CompactHeader = style([
  DefaultReset,
  StickySection,
  {
    maxWidth: toRem(170),
    width: '100%',
  },
]);

export const AvatarBase = style({
  display: 'flex',
  alignSelf: 'start',
});

export const ModernBefore = style({
  minWidth: toRem(36),
});

export const BubbleBefore = style({
  minWidth: toRem(36),
});

export const BubbleContent = style({
  maxWidth: toRem(800),
  padding: config.space.S200,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  borderRadius: config.radii.R500,
  position: 'relative',
});

export const BubbleContentOwn = style({
  backgroundColor: color.Primary.Container,
  color: color.Primary.OnContainer,
});

export const ModernOwnContent = style({
  backgroundColor: color.Primary.Container,
  color: color.Primary.OnContainer,
  borderRadius: config.radii.R400,
  padding: `${config.space.S100} ${config.space.S200}`,
});

export const BubbleContentArrowLeft = style({
  borderTopLeftRadius: 0,
});

export const BubbleLeftArrow = style({
  width: toRem(9),
  height: toRem(8),

  position: 'absolute',
  top: 0,
  left: toRem(-8),
  zIndex: 1,
});

export const BubbleContentArrowRight = style({
  borderTopRightRadius: 0,
});

export const BubbleRightArrow = style({
  width: toRem(9),
  height: toRem(8),
  position: 'absolute',
  top: 0,
  right: toRem(-8),
  zIndex: 1,
});

export const Username = recipe({
  base: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    selectors: {
      'button&': {
        cursor: 'pointer',
      },
      'button&:hover, button&:focus-visible': {
        textDecoration: 'underline',
      },
    },
  },
  variants: {
    variant: {
      Secondary: {
        color: elevoColor.Text.Secondary,
      }
    }
  }
});

export const UsernameBold = style({
  fontWeight: 550,
});

export const UsernameSecondary = style({
  color: elevoColor.Text.Secondary,
});

export const MessageTextBody = recipe({
  base: {
    wordBreak: 'break-word',
  },
  variants: {
    preWrap: {
      true: {
        whiteSpace: 'pre-wrap',
      },
    },
    jumboEmoji: {
      true: {
        fontSize: '1.504em',
        lineHeight: '1.4962em',
      },
    },
    emote: {
      true: {
        color: color.Success.Main,
        fontStyle: 'italic',
      },
    },
  },
});

export type MessageTextBodyVariants = RecipeVariants<typeof MessageTextBody>;

export type UsernameVariants = RecipeVariants<typeof Username>;
