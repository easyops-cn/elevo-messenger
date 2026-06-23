import { keyframes, style } from '@vanilla-extract/css';
import { color, config } from 'folds';

const reasoningSpinner = keyframes({
  to: { transform: 'rotate(360deg)' },
});

export const ReasoningWrapper = style({
  opacity: 0.7,
  fontSize: config.fontSize.T300,
});

export const ReasoningToggle = style({
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  width: 'fit-content',
});

export const ReasoningToggleEmpty = style({
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
  width: 'fit-content',
});

export const ReasoningStatusSpinner = style({
  animation: `${reasoningSpinner} 0.8s linear infinite`,
});

export const ReasoningStatusError = style({
  color: color.Critical.Main,
});
