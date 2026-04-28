import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const RadioOption = style([
  DefaultReset,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.space.S100,
    border: 0,
    padding: 0,
    margin: 0,
    background: 'none',
    cursor: 'pointer',
    ':disabled': {
      cursor: 'not-allowed',
      opacity: config.opacity.P300,
    },
  },
]);

export const RadioIconSelected = style({
  color: color.Primary.Main,
});
