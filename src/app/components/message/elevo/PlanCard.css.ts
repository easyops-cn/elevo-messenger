import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const PlanCard = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
  overflow: 'hidden',
});

export const PlanCardHeader = style({
  padding: `0 ${config.space.S200} 0 ${config.space.S300}`,
  borderBottomWidth: config.borderWidth.B300,
  gap: config.space.S200,
});

export const PlanCardContent = style({
  minWidth: toRem(200),
  padding: `${config.space.S200} ${config.space.S300} ${config.space.S300}`,
});
