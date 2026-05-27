import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const Root = style({
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
});

export const Center = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: config.space.S400,
  boxSizing: 'border-box',
});

export const Viewer = style({
  width: '100%',
  height: '100%',
});
