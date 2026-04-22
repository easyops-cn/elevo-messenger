import { createTheme } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const elevoConfig = createTheme(config, {
  font: {
    Inter:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
  },
  fontSize: {
    D400: toRem(45),

    H1: toRem(35),
    H2: toRem(25),
    H3: toRem(20),
    H4: toRem(18),
    H5: toRem(16),
    H6: toRem(14),

    T500: toRem(17),
    T400: toRem(15),
    T300: toRem(14),
    T200: toRem(12),

    B500: toRem(16),
    B400: toRem(14),
    B300: toRem(12),

    L400: toRem(12),
    O400: toRem(12),
    C400: toRem(12),
  },
  lineHeight: {
    D400: toRem(52),

    H1: toRem(40),
    H2: toRem(32),
    H3: toRem(28),
    H4: toRem(26),
    H5: toRem(24),
    H6: toRem(20),

    T500: toRem(26),
    T400: toRem(24),
    T300: toRem(22),
    T200: toRem(20),

    B500: toRem(22),
    B400: toRem(20),
    B300: toRem(18),

    L400: toRem(16),
    O400: toRem(16),
    C400: toRem(16),
  },
  letterSpacing: {
    D400: '0',

    H1: '0',
    H2: '0',
    H3: '0',
    H4: '0',
    H5: '0',
    H6: '0',

    T500: '0',
    T400: '0',
    T300: '0',
    T200: '0',

    B500: '0',
    B400: '0',
    B300: '0',

    L400: '0',
    O400: '0',
    C400: '0',
  },
  fontWeight: {
    W100: '100',
    W200: '200',
    W300: '300',
    W400: '400',
    W500: '500',
    W600: '600',
    W700: '700',
    W800: '800',
    W900: '900',
  },
  space: {
    S0: '0',
    S100: toRem(4),
    S200: toRem(8),
    S300: toRem(12),
    S400: toRem(16),
    S500: toRem(20),
    S600: toRem(24),
    S700: toRem(32),
  },
  radii: {
    R0: '0',
    R300: toRem(4),
    R400: toRem(8),
    R500: toRem(12),
    Round: '50%',
    Pill: '9999px',
  },
  borderWidth: {
    B0: '0',
    B300: '1px',
    B400: '1.5px',
    B500: '2px',
    B600: '3px',
    B700: '4px',
  },
  zIndex: {
    Z100: '100',
    Z200: '200',
    Z300: '300',
    Z400: '400',
    Max: '9999',
  },
  shadow: {
    E100: `0px 1px 6px -2px ${color.Other.Shadow}`,
    E200: `0px 1px 12px -3px ${color.Other.Shadow}`,
    E300: `0px 2px 16px -4px ${color.Other.Shadow}`,
    E400: `0px 4px 26px -6px ${color.Other.Shadow}`,
  },
  size: {
    XInherit: '1em',
    X50: toRem(16),
    X100: toRem(18),
    X200: toRem(20),
    X300: toRem(22),
    X400: toRem(24),
    X500: toRem(28),
    X600: toRem(36),

    DialogWidth: toRem(380),
    ModalHeight300: toRem(580),
    ModalHeight400: toRem(684),
    ModalHeight500: toRem(684),
    ModalWidth300: toRem(460),
    ModalWidth400: toRem(524),
    ModalWidth500: toRem(802),
    ModalDrawerWidth: toRem(222),
  },
  transition: {},
  opacity: {
    P500: '1',
    P400: '0.9',
    P300: '0.75',
    Placeholder: '0.5',
    Disabled: '0.38',
  },
});

export const [elevoLight, elevoColor] = createTheme({
  Background: {
    NavBar: 'linear-gradient(0deg, #F7F7F7 0%, #F7F7F7 100%), rgba(255, 255, 255, 0.50)',
    Page: 'rgba(255, 255, 255, 0.75)',
  },
  Border: {
    ExtremeLight: 'rgba(0, 0, 0, 0.04)',
  },
  shadow: {
    SpecularHighlight:
      '-1px -1px 0 0 #FFF inset, 1px 1px 0 0 #FFF inset, 5px 4px 8px 0 rgba(0, 0, 0, 0.03) inset',
    SurfaceContainer: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    NavBar: '0 8px 40px 0 rgba(0, 0, 0, 0.12)',
    Page: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    Header: '0 4px 16px 0 rgba(0, 0, 0, 0.15)',
  },
  Text: {
    Secondary: 'rgba(0, 0, 0, 0.5)',
    Muted: 'rgba(0, 0, 0, 0.35)',
    Disabled: 'rgba(0, 0, 0, 0.26)',
  },
});

export const elevoDark = createTheme(elevoColor, {
  Background: {
    NavBar: 'rgba(0,0,0,0.2)',
    Page: '#1E1E1E',
  },
  Border: {
    ExtremeLight: 'rgba(255, 255, 255, 0.04)',
  },
  shadow: {
    SpecularHighlight:
      '-0.2px -0.5px 1px 0 rgba(255, 255, 255, 0.25) inset, 0.5px 0.6px 1px 0 rgba(255, 255, 255, 0.35) inset, 0 0 7.6px 0 rgba(0, 0, 0, 0.15) inset, 0 4px 4px 0 rgba(0, 0, 0, 0.25)',
    SurfaceContainer: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    NavBar: '0 8px 40px 0 rgba(0, 0, 0, 0.12)',
    Page: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    Header: '0 4px 16px 0 rgba(0, 0, 0, 0.15)',
  },
  Text: {
    Secondary: 'rgba(0, 0, 0, 0.55)',
    Muted: 'rgba(0, 0, 0, 0.35)',
    Disabled: 'rgba(0, 0, 0, 0.26)',
  },
});
