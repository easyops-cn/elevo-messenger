import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const ReasoningWrapper = style({
  opacity: 0.7,
  fontSize: config.fontSize.T300,
});

export const ReasoningToggle = style({
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: config.space.S100,
});
