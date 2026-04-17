import { style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

export const SyncStatusText = style({
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
  position: 'absolute',
  top: 'calc(50% + 4px)',
  transform: 'translateY(-50%)',
  left: toRem(90),
});

export const positionCenter = style({
  
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
