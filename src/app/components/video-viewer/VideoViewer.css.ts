import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const VideoViewer = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const VideoViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const VideoViewerContent = style([
  DefaultReset,
  {
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    padding: config.space.S200,
  },
]);

export const VideoViewerPlayer = style([
  DefaultReset,
  {
    width: '100%',
    height: '100%',
  },
]);
