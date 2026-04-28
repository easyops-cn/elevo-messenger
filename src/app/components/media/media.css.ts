import { style } from '@vanilla-extract/css';
import { DefaultReset } from 'folds';

export const Image = style([
  DefaultReset,
  {
    display: 'block',
    width: '100%',
    height: '100%',
  },
]);

export const Video = style([
  DefaultReset,
  {
    objectFit: 'contain',
    width: '100%',
    height: '100%',
  },
]);
