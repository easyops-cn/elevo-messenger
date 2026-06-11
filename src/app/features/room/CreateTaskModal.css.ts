import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

/** Assignee trigger button: shows selected member or a placeholder. */
export const AssigneeTrigger = style([
  DefaultReset,
  {
    display: 'flex',
    alignItems: 'center',
    gap: config.space.S200,
    width: '100%',
    minWidth: 0,
    padding: config.space.S200,
    borderRadius: config.radii.R400,
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    border: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
    cursor: 'pointer',
    selectors: {
      '&:hover': { backgroundColor: color.Background.ContainerHover },
      '&:focus-visible': {
        outline: `${config.borderWidth.B400} solid ${color.Primary.Main}`,
      },
    },
  },
]);

/** Placeholder text inside the trigger when nothing is selected. */
export const Placeholder = style([DefaultReset, { color: color.Surface.OnContainer }]);

/** Floating member picker dropdown, overlaid on the field below. */
export const PickerMenu = style([DefaultReset, { boxShadow: config.shadow.E200 }]);

/** Member list inside the floating picker; height is capped by the Scroll. */
export const MemberList = style([DefaultReset, { maxHeight: toRem(220) }]);

export const TextAreaField = style([DefaultReset, { width: '100%' }]);
