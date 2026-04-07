import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const WaveformPlayerContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
});

export const WaveformContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(2),
  height: toRem(32),
  cursor: 'pointer',
  userSelect: 'none',
});

export const WaveformBar = style({
  width: toRem(2),
  borderRadius: toRem(1),
  transition: 'background-color 0.1s',
});

export const TimeText = style({
  minWidth: toRem(48),
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
});
