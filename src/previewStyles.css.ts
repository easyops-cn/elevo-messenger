import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const PreviewBody = 'PreviewBody';

globalStyle(`body.${PreviewBody}`, {
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
});

export const PreviewShell = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const PreviewHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const PreviewCenter = style([
  DefaultReset,
  {
    height: '100%',
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
  },
]);
