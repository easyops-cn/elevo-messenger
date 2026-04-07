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
  width: '100%',
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
  height: toRem(36),
  flex: 1,
  overflow: 'hidden',
});

export const WaveformBar = style({
  flexShrink: 0,
  width: toRem(3),
  borderRadius: toRem(2),
  // transition: 'height 0.1s ease',
});

export const RecordingDot = style({
  width: toRem(8),
  height: toRem(8),
  borderRadius: '50%',
  backgroundColor: color.Critical.Main,
  flexShrink: 0,
  animationName: blinkAnimation,
  animationDuration: '1.2s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

export const ErrorText = style({
  color: color.Critical.Main,
});
