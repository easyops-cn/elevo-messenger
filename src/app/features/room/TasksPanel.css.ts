import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const StateBox = style([
  DefaultReset,
  {
    paddingInline: config.space.S200,
    paddingBlock: config.space.S100,
  },
]);

export const ErrorText = style([DefaultReset, { color: color.Critical.Main }]);

export const StatsGrid = style([
  DefaultReset,
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: config.space.S200,
    paddingInline: config.space.S200,
  },
]);

/** Borderless 2x2 stat card. Uniform Surface background; only the icon is toned. */
export const StatCard = style([
  DefaultReset,
  {
    display: 'flex',
    gap: config.space.S200,
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
  },
]);

/** Clickable variant (desktop): opens the board window. */
export const StatCardClickable = style({
  cursor: 'pointer',
  selectors: {
    '&:hover': { backgroundColor: color.Surface.ContainerHover },
    '&:focus-visible': {
      outline: `${config.borderWidth.B400} solid ${color.Primary.Main}`,
    },
  },
});

export const StatCount = style([DefaultReset, { lineHeight: 1 }]);

export const StatIcon = style([DefaultReset, { flexShrink: 0 }]);

/* Per-status icon tone (color only; card background stays uniform). */
export const toneBacklog = style({ color: color.Secondary.Main });
export const tonePlanned = style({ color: color.Primary.Main });
export const toneInProgress = style({ color: color.Warning.Main });
export const toneCompleted = style({ color: color.Success.Main });
