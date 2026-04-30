import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

export const searchShortcutHint = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: toRem(4),
  marginInlineStart: toRem(6),
});

export const searchShortcutKey = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: toRem(18),
  padding: `0 ${toRem(6)}`,
  borderRadius: toRem(5),
  border: `1px solid ${color.SurfaceVariant.ContainerLine}`,
  background: color.SurfaceVariant.Container,
  boxShadow: `inset 0 -1px 0 ${color.SurfaceVariant.ContainerLine}`,
  fontSize: toRem(12),
  fontFamily: 'inherit',
  lineHeight: toRem(16),
  fontWeight: 600,
});
