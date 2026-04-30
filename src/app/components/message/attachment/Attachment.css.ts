import { style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const Attachment = recipe({
  base: {
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderRadius: config.radii.R400,
    overflow: 'hidden',
    maxWidth: '100%',
    width: toRem(400),
  },
  variants: {
    outlined: {
      true: {
        boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
      },
    },
  },
});

export type AttachmentVariants = RecipeVariants<typeof Attachment>;

export const AttachmentHeader = style({
  padding: config.space.S300,
});

export const AttachmentBox = recipe({
  base: [
    DefaultReset,
    {
      maxWidth: '100%',
      maxHeight: toRem(600),
      width: toRem(400),
      overflow: 'hidden',
    },
  ],
  variants: {
    image: {
      true: {
        backgroundColor: '#FFFFFF',
        borderRadius: config.radii.R400,
        width: 'initial',
        maxHeight: 'initial',
      },
    },
  }
});

export type AttachmentBoxVariants = RecipeVariants<typeof AttachmentBox>;

export const AttachmentContent = style({
  padding: config.space.S300,
  paddingTop: 0,
});
