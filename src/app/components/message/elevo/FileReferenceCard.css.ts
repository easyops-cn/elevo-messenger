import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

const cardBorder = `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`;

export const FileReferenceCard = style({
  marginTop: config.space.S100,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${toRem(2)} ${config.space.S100}`,
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  maxWidth: toRem(320),
  width: 'fit-content',
});

export const InteractiveFileReferenceCard = style({
  cursor: 'pointer',
  font: 'inherit',
  textAlign: 'left',
  selectors: {
    '&:hover': {
      backgroundColor: color.SurfaceVariant.ContainerHover,
    },
    '&:focus-visible': {
      outline: `${config.borderWidth.B600} solid ${color.Primary.Main}`,
      outlineOffset: toRem(2),
    },
  },
});
