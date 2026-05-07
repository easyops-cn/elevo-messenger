import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

const cardBorder = `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`;

export const OidcCard = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: config.space.S300,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  textDecoration: 'none',
  cursor: 'default',
  transition: 'background-color 0.15s ease',
  maxWidth: toRem(400),
});

export const OidcCardClickable = style({
  cursor: 'pointer',
});
