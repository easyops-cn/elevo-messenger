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
    gap: toRem(8),
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

export const SearchBox = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: toRem(6),
    height: toRem(26),
    padding: `0 ${toRem(10)}`,
    borderRadius: toRem(6),
    backgroundColor: color.SurfaceVariant.ContainerHover,
    color: color.SurfaceVariant.OnContainer,
    fontSize: toRem(12),
    cursor: 'pointer',
    // @ts-expect-error non-standard CSS property
    appRegion: 'no-drag',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    minWidth: 0,
    maxWidth: toRem(400),
    flex: 1,
  },
]);

export const SearchBoxIcon = style({
  flexShrink: 0,
  opacity: 0.6,
});

export const SearchBoxText = style({
  flex: 1,
  opacity: 0.5,
});

export const SearchBoxShortcut = style({
  opacity: 0.4,
  fontSize: toRem(11),
  flexShrink: 0,
});

export const TrafficLightSpacer = style({
  width: toRem(70),
  flexShrink: 0,
});

export const LeftSection = style({
  width: toRem(138),
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: toRem(12),
  pointerEvents: 'none',
});

export const AppTitle = style({
  fontSize: toRem(12),
  fontWeight: 600,
  opacity: 0.7,
  whiteSpace: 'nowrap',
});

export const WindowControls = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    flexShrink: 0,
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
