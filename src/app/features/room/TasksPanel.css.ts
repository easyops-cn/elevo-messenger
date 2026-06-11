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

/** Borderless, tinted 2x2 stat card. Background/text tone set per status. */
export const StatCard = style([
  DefaultReset,
  {
    display: 'flex',
    gap: config.space.S200,
    padding: config.space.S300,
    borderRadius: config.radii.R400,
  },
]);

export const StatCount = style([DefaultReset, { lineHeight: 1 }]);

export const StatIcon = style([DefaultReset, { flexShrink: 0, opacity: config.opacity.P500 }]);

/* Per-status tone: tinted container background + matching foreground. */
export const toneBacklog = style({
  backgroundColor: color.Secondary.Container,
  color: color.Secondary.OnContainer,
});
export const tonePlanned = style({
  backgroundColor: color.Primary.Container,
  color: color.Primary.OnContainer,
});
export const toneInProgress = style({
  backgroundColor: color.Warning.Container,
  color: color.Warning.OnContainer,
});
export const toneCompleted = style({
  backgroundColor: color.Success.Container,
  color: color.Success.OnContainer,
});
