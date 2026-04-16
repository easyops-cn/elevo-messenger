import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { color, config, toRem } from 'folds';

// Shared card section styles

const dividerBorder = `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`;
const cardPadding = `${config.space.S200} ${config.space.S300}`;

export const CardContainer = style({
  backgroundColor: color.SurfaceVariant.Container,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
  maxWidth: toRem(600),
  overflow: 'hidden',
});

export const CardHeader = style({
  padding: cardPadding,
  borderBottom: dividerBorder,
});

export const CardBody = style({
  padding: cardPadding,
});

export const CardFooter = style({
  padding: cardPadding,
  borderTop: dividerBorder,
});

// Question card styles

export const QuestionCardFooter = style({
  padding: cardPadding,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
});

export const QuestionTabsBar = style({
  display: 'flex',
  gap: config.space.S300,
  marginBottom: config.space.S300,
});

export const QuestionTab = recipe({
  base: {
    padding: `${config.space.S100} 0`,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    borderBottom: `2px solid transparent`,
    marginBottom: `-1px`,
    color: color.Secondary.Main,
    transition: 'border-color 0.2s, color 0.2s',
    selectors: {
      '&:hover': {
        color: color.Primary.Main,
      },
    },
  },
  variants: {
    active: {
      true: {
        color: color.Primary.Main,
        borderBottomColor: color.Primary.Main,
      },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const OptionItem = recipe({
  base: {
    padding: `${config.space.S100} ${config.space.S200}`,
    borderRadius: config.radii.R300,
    border: `${config.borderWidth.B300} solid transparent`,
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    selectors: {
      '&:hover': {
        backgroundColor: color.Secondary.Container,
      },
    },
  },
  variants: {
    selected: {
      true: {
        backgroundColor: color.Primary.Container,
        border: `${config.borderWidth.B300} solid ${color.Primary.Main}`,
        selectors: {
          '&:hover': {
            backgroundColor: color.Primary.Container,
          },
        },
      },
      false: {
        cursor: 'pointer',
      },
    },
    disabled: {
      true: {
        cursor: 'default',
        opacity: 0.5,
        selectors: {
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
  },
  defaultVariants: {
    selected: false,
    disabled: false,
  },
});

export const OptionIcon = style({
  color: color.Secondary.MainLine,
  flexShrink: 0,
});

export const SubmitButton = recipe({
  base: {
    padding: `${config.space.S100} ${config.space.S400}`,
    borderRadius: config.radii.R400,
    border: 'none',
    backgroundColor: color.Primary.Main,
    color: color.Primary.OnMain,
    fontSize: toRem(14),
    fontWeight: 600,
    lineHeight: 1.5,
    selectors: {
      '&:hover': {
        opacity: 0.9,
      },
    },
  },
  variants: {
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'not-allowed',
        selectors: {
          '&:hover': {
            opacity: 0.5,
          },
        },
      },
      false: {
        cursor: 'pointer',
      },
    },
  },
  defaultVariants: {
    disabled: false,
  },
});

export const OtherInput = style({
  width: '100%',
  padding: config.space.S100,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  backgroundColor: color.SurfaceVariant.Container,
  color: 'inherit',
  fontSize: config.fontSize.T300,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
});

export const SubmittedIcon = style({
  color: color.Success.Main,
});

export const SubmittedText = style({
  color: color.Success.Main,
});

export const AnsweredItem = style({
  padding: `${config.space.S200} 0`,
});

export const AssignedHint = style({
  color: color.Secondary.Main,
  fontSize: toRem(12),
  lineHeight: 1.5,
});
