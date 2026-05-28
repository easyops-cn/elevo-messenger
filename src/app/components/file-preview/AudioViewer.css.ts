import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const AudioViewer = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const AudioViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const AudioViewerContent = style([
  DefaultReset,
  {
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    padding: config.space.S300,
  },
]);

export const AudioViewerInner = style([
  DefaultReset,
  {
    width: 'fit-content',
    maxWidth: '40rem',
  },
]);

export const AudioViewerControl = style([
  DefaultReset,
  {
    width: '100%',
    maxWidth: '40rem',
  },
]);
