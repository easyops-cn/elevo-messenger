import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const CategoryButton = style({
  flexGrow: 1,
});
export const CategoryButtonIcon = style({
  opacity: config.opacity.P400,
});

export const StarredThreadNavItem = style({
  minHeight: toRem(32),
});

export const StarredThreadNavContent = style({
  paddingLeft: toRem(17),
});

export const StarredThreadRelation = style({
  width: toRem(18),
  height: toRem(18),
  color: color.SurfaceVariant.OnContainer,
  opacity: config.opacity.P300,
  flexShrink: 0,
});
