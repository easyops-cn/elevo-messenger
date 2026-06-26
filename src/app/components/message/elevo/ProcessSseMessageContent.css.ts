import { keyframes, style } from '@vanilla-extract/css';
import { color, config } from 'folds';

const spinner = keyframes({
  to: { transform: 'rotate(360deg)' },
});

export const ProcessSseMessage = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S200,
});

export const ProcessSseBlock = style({
  minWidth: 0,
});

export const ProcessSseDetailsToggle = style({
  alignItems: 'center',
  background: 'none',
  border: 'none',
  color: color.SurfaceVariant.OnContainer,
  cursor: 'pointer',
  display: 'inline-flex',
  font: 'inherit',
  gap: config.space.S100,
  opacity: config.opacity.P300,
  padding: 0,
  width: 'fit-content',
});

export const ProcessSseDetails = style({
  borderLeft: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S200,
  marginTop: config.space.S200,
  paddingLeft: config.space.S300,
});

export const ProcessSseStatus = style({
  alignItems: 'center',
  color: color.SurfaceVariant.OnContainer,
  display: 'inline-flex',
  fontSize: config.fontSize.T300,
  gap: config.space.S100,
  opacity: config.opacity.P300,
});

export const ProcessSseError = style({
  color: color.Critical.Main,
});

export const ProcessSseSpinner = style({
  animation: `${spinner} 0.8s linear infinite`,
});
