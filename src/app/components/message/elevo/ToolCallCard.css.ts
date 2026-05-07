import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

const cardBorder = `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`;

export const ToolCallHeader = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${config.space.S100} ${config.space.S200}`,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  cursor: 'pointer',
  width: 'fit-content',
});

export const ToolCallBody = style({
  backgroundColor: color.SurfaceVariant.Container,
  border: cardBorder,
  borderRadius: config.radii.R300,
  padding: `${config.space.S200} ${config.space.S300}`,
  maxWidth: toRem(600),
});

export const Label = style({
  fontWeight: 500,
  marginBottom: config.space.S100,
});

export const Preformatted = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
});

export const ErrorPre = style({
  fontFamily: 'monospace',
  fontSize: toRem(12),
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
  color: color.Critical.Main,
});

export const Divider = style({
  borderTop: cardBorder,
  margin: `${config.space.S200} 0`,
});
