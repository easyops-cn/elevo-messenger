import { keyframes, style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

const blinkAnimation = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.2 },
});

export const VoiceRecordingBoardBase = style([
  DefaultReset,
  {
    position: 'relative',
    pointerEvents: 'none',
  },
]);

export const VoiceRecordingBoardContainer = style([
  DefaultReset,
  {
    position: 'absolute',
    bottom: config.space.S200,
    left: 0,
    right: 0,
    zIndex: config.zIndex.Max,
    display: 'flex',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
  },
]);

export const VoiceRecordingBoard = style({
  maxWidth: toRem(400),
  width: 'fit-content',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
  pointerEvents: 'all',
  padding: config.space.S300,
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S200,
});

export const WaveformContainer = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(2),
  height: toRem(32),
  width: toRem(158),
  overflow: 'hidden',
});

export const WaveformBar = style({
  flexShrink: 0,
  width: toRem(2),
  borderRadius: toRem(1),
  // transition: 'height 0.1s ease',
});

export const RecordingDot = style({
  width: toRem(32),
  height: toRem(32),
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animationName: blinkAnimation,
  animationDuration: '1.2s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export const RecordingDotInner = style({
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  backgroundColor: color.Critical.Main,
});

export const IdleDot = style({
  width: toRem(32),
  height: toRem(32),
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const IdleDotInner = style({
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  backgroundColor: color.Surface.OnContainer,
  opacity: 0.3,
});

export const ErrorText = style({
  color: color.Critical.Main,
});
