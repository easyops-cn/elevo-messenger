import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const StatsCard = style([
  DefaultReset,
  {
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    padding: config.space.S300,
    borderRadius: config.radii.R400,
    borderWidth: config.borderWidth.B300,
    borderStyle: 'solid',
    borderColor: color.SurfaceVariant.ContainerLine,
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    selectors: {
      '&:hover': { backgroundColor: color.SurfaceVariant.ContainerHover },
      '&:focus-visible': {
        outline: `${config.borderWidth.B400} solid ${color.Primary.Main}`,
      },
    },
  },
]);

export const StatusGrid = style([
  DefaultReset,
  {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: config.space.S200,
  },
]);

export const StatusCount = style([DefaultReset, { marginLeft: 'auto' }]);

export const ErrorText = style([DefaultReset, { color: color.Critical.Main }]);

export const StatusDot = style([
  DefaultReset,
  {
    width: toRem(8),
    height: toRem(8),
    borderRadius: '50%',
    flexShrink: 0,
  },
]);

export const dotBacklog = style({ backgroundColor: color.Secondary.Main });
export const dotPlanned = style({ backgroundColor: color.Primary.Main });
export const dotInProgress = style({ backgroundColor: color.Warning.Main });
export const dotCompleted = style({ backgroundColor: color.Success.Main });
