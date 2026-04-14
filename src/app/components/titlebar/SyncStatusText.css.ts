import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

export const SyncStatusText = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  fontSize: toRem(11),
  fontWeight: 500,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  pointerEvents: 'auto',
  // @ts-expect-error non-standard CSS property
  appRegion: 'no-drag',
});

export const positionLeft = style({
  left: toRem(12),
});

export const positionRight = style({
  right: toRem(12),
});

export const success = style({
  color: color.Success.Main,
});

export const warning = style({
  color: color.Warning.Main,
});

export const critical = style({
  color: color.Critical.Main,
});
