import { keyframes, style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const RoomSidePanel = style({
  width: toRem(234),
});

export const MemberDrawerContentBase = style({
  position: 'relative',
  overflow: 'hidden',
});

export const MemberDrawerContent = style({
  padding: `${config.space.S600} 0`,
});

const ScrollBtnAnime = keyframes({
  '0%': {
    transform: `translate(-50%, -100%) scale(0)`,
  },
  '100%': {
    transform: `translate(-50%, 0) scale(1)`,
  },
});

export const DrawerScrollTop = style({
  position: 'absolute',
  top: config.space.S200,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1,
  animation: `${ScrollBtnAnime} 100ms`,
});

export const MembersGroupLabel = style({
  padding: config.space.S200,
});

export const MembersGroupLabelWithFilter = style({
  padding: `${config.space.S100} ${config.space.S200}`,
});

export const DrawerVirtualItem = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
});
