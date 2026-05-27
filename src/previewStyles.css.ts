import { globalStyle, style } from '@vanilla-extract/css';
import { DefaultReset, color } from 'folds';

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

export const PreviewCenter = style([
  DefaultReset,
  {
    height: '100%',
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
  },
]);
