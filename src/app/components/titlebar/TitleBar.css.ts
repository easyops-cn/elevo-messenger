import { style, globalStyle } from '@vanilla-extract/css';
import { color, config, DefaultReset, toRem } from 'folds';

export const TITLEBAR_HEIGHT = 38;

export const TitleBarContainer = style([
  DefaultReset,
  {
    height: toRem(TITLEBAR_HEIGHT),
    minHeight: toRem(TITLEBAR_HEIGHT),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: color.Background.Container,
    borderBottom: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
    color: color.Background.OnContainer,
    userSelect: 'none',
    WebkitUserSelect: 'none',
    zIndex: 9999,
  },
]);

export const TitleText = style([
  DefaultReset,
  {
    fontSize: toRem(13),
    fontWeight: 500,
    pointerEvents: 'none',
  },
]);

export const TrafficLightSpacer = style({
  width: toRem(70),
  flexShrink: 0,
});

export const WindowControls = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
  },
]);

export const WindowControlButton = style([
  DefaultReset,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: toRem(46),
    height: '100%',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    backgroundColor: 'transparent',
    ':hover': {
      backgroundColor: color.SurfaceVariant.ContainerHover,
    },
    ':active': {
      backgroundColor: color.SurfaceVariant.ContainerActive,
    },
  },
]);

export const CloseButton = style({
  selectors: {
    '&:hover': {
      backgroundColor: '#e81123',
      color: '#ffffff',
    },
    '&:active': {
      backgroundColor: '#bf0f1d',
      color: '#ffffff',
    },
  },
});

// Ensure drag region CSS for Windows touch/pen support
globalStyle('*[data-tauri-drag-region]', {
  // @ts-expect-error non-standard CSS property
  appRegion: 'drag',
});
