import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const PageNotFound = style({
  minHeight: toRem(520),
  padding: `${config.space.S700} ${config.space.S400}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const HeroSection = style({
  width: '100%',
});
