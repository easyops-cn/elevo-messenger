import { style } from '@vanilla-extract/css';
import { toRem } from 'folds';

export const searchShortcutHint = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  marginInlineStart: toRem(6),
});
