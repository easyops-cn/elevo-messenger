import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const PlanCard = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R300,
  padding: config.space.S300,
  maxWidth: toRem(600),
  overflow: 'hidden',
});
