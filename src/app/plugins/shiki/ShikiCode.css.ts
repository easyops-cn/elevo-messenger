import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const NumberedCode = style([
  DefaultReset,
  {
    display: 'block',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
]);

export const Line = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'flex-start',
  },
]);

export const LineNo = style([
  DefaultReset,
  {
    flexShrink: 0,
    position: 'sticky',
    left: 0,
    // Opaque gutter background so horizontally-scrolled code does not show
    // through behind the sticky line numbers.
    backgroundColor: color.Background.Container,
    minWidth: toRem(40),
    paddingRight: config.space.S300,
    textAlign: 'right',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    opacity: 0.5,
  },
]);

export const LineContent = style([
  DefaultReset,
  {
    whiteSpace: 'pre',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
]);
