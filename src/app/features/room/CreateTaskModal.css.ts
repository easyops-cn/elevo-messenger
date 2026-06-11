import { style } from '@vanilla-extract/css';
import { DefaultReset, toRem } from 'folds';

/** Member list inside the floating picker; height is capped by the Scroll. */
export const MemberList = style([DefaultReset, { maxHeight: toRem(220) }]);

export const TextAreaField = style([DefaultReset, { width: '100%' }]);
