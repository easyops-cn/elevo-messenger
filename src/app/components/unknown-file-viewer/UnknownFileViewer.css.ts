import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const UnknownFileViewer = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const UnknownFileViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);
