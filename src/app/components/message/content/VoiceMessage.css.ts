import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const VoiceMessageContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  width: '100%',
  maxWidth: toRem(400),
});

export const WaveformContainer = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: toRem(2),
  flex: 1,
  height: toRem(32),
  cursor: 'pointer',
  userSelect: 'none',
});

export const WaveformBar = style({
  flex: 1,
  minWidth: toRem(2),
  borderRadius: toRem(1),
  transition: 'background-color 0.1s',
});

export const TimeText = style({
  minWidth: toRem(48),
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
});
