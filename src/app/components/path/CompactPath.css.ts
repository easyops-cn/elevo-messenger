import { style } from '@vanilla-extract/css';

export const CompactPath = style({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
});

export const CompactPathWhole = style({
  display: 'block',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const CompactPathMiddle = style({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
