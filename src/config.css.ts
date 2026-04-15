import { createTheme } from '@vanilla-extract/css';
import { config } from 'folds';

export const onLightFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '400',
  W500: '500',
  W600: '600',
  W700: '700',
  W800: '800',
  W900: '900',
});

export const onDarkFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '400',
  W500: '500',
  W600: '600',
  W700: '700',
  W800: '800',
  W900: '900',
});

export const [elevoLight, elevoColor] = createTheme({
  Background: {
    NavBar: 'linear-gradient(0deg, #F7F7F7 0%, #F7F7F7 100%), rgba(255, 255, 255, 0.50)',
  },
  shadow: {
    SpecularHighlight: '-1px -1px 0 0 #FFF inset, 1px 1px 0 0 #FFF inset, 5px 4px 8px 0 rgba(0, 0, 0, 0.03) inset',
    SurfaceContainer: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    NavBar: '0 8px 40px 0 rgba(0, 0, 0, 0.12)',
  }
});

export const elevoDark = createTheme(elevoColor, {
  Background: {
    NavBar: 'rgba(0,0,0,0.2)',
  },
  shadow: {
    SpecularHighlight: '-0.2px -0.5px 1px 0 rgba(255, 255, 255, 0.25) inset, 0.5px 0.6px 1px 0 rgba(255, 255, 255, 0.35) inset, 0 0 7.6px 0 rgba(0, 0, 0, 0.15) inset, 0 4px 4px 0 rgba(0, 0, 0, 0.25)',
    SurfaceContainer: '0 11px 13.7px 0 rgba(0, 0, 0, 0.05)',
    NavBar: '0 8px 40px 0 rgba(0, 0, 0, 0.12)',
  }
});
