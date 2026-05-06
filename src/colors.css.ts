import { createTheme } from '@vanilla-extract/css';
import { color } from 'folds';

export const lightTheme = createTheme(color, {
  Background: {
    Container: '#F9F9F9',
    ContainerHover: 'rgba(0, 0, 0, 0.04)',
    ContainerActive: 'rgba(0, 0, 0, 0.08)',
    ContainerLine: '#CCCCCC',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Surface: {
    Container: '#FFFFFF',
    ContainerHover: '#F2F2F2',
    ContainerActive: '#E5E5E5',
    ContainerLine: '#D9D9D9',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  SurfaceVariant: {
    Container: '#F2F2F2',
    ContainerHover: '#E5E5E5',
    ContainerActive: '#D9D9D9',
    ContainerLine: '#CCCCCC',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Primary: {
    Main: '#007AFF',
    MainHover: '#007AFF',
    MainActive: '#007AFF',
    MainLine: '#007AFF',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#E6F4FF',
    ContainerHover: '#E6F4FF',
    ContainerActive: '#E6F4FF',
    ContainerLine: '#BDE1FF',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Secondary: {
    Main: 'rgba(0, 0, 0, 0.85)',
    MainHover: '#1A1A1A',
    MainActive: '#262626',
    MainLine: '#333333',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#D9D9D9',
    ContainerHover: '#CCCCCC',
    ContainerActive: '#BFBFBF',
    ContainerLine: '#B2B2B2',
    OnContainer: '#0D0D0D',
  },

  Success: {
    Main: '#29CC49',
    MainHover: '#A5F2AC',
    MainActive: '#29CC49',
    MainLine: '#29CC49',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#E6FFE7',
    ContainerHover: '#E6FFE7',
    ContainerActive: '#E6FFE7',
    ContainerLine: '#A5F2AC',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Warning: {
    Main: '#F0A22E',
    MainHover: '#FCC058',
    MainActive: '#F0A22E',
    MainLine: '#F0A22E',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#F6EEE5',
    ContainerHover: '#F2E5D9',
    ContainerActive: '#EEDDCC',
    ContainerLine: '#E9D4BF',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Critical: {
    Main: '#F24C25',
    MainHover: '#FF9A78',
    MainActive: '#F24C25',
    MainLine: '#F24C25',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#FFF8E6',
    ContainerHover: '#FFF8E6',
    ContainerActive: '#FFF8E6',
    ContainerLine: '#FFE6AB',
    OnContainer: 'rgba(0, 0, 0, 0.85)',
  },

  Other: {
    FocusRing: 'rgba(0 0 0 / 50%)',
    Shadow: 'rgba(0 0 0 / 20%)',
    Overlay: 'rgba(0 0 0 / 50%)',
  },
});

const darkThemeData = {
  Background: {
    Container: '#323232',
    ContainerHover: 'rgba(255, 255, 255, 0.075)',
    ContainerActive: 'rgba(255, 255, 255, 0.1)',
    ContainerLine: '#404040',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Surface: {
    Container: '#1E1E1E',
    ContainerHover: '#333333',
    ContainerActive: '#404040',
    ContainerLine: '#4D4D4D',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  SurfaceVariant: {
    Container: '#333333',
    ContainerHover: '#404040',
    ContainerActive: '#4D4D4D',
    ContainerLine: '#595959',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Primary: {
    Main: '#0A84FF',
    MainHover: '#134B85',
    MainActive: '#0A84FF',
    MainLine: '#0A84FF',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#162437',
    ContainerHover: '#162437',
    ContainerActive: '#162437',
    ContainerLine: '#142F4F',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Secondary: {
    Main: '#FFFFFF',
    MainHover: '#E5E5E5',
    MainActive: '#D9D9D9',
    MainLine: '#CCCCCC',
    OnMain: '#1A1A1A',
    Container: 'rgba(255, 255, 255, 0.1)',
    ContainerHover: '#4D4D4D',
    ContainerActive: '#595959',
    ContainerLine: '#666666',
    OnContainer: '#F2F2F2',
  },

  Success: {
    Main: '#0BA730',
    MainHover: '#126629',
    MainActive: '#0BA730',
    MainLine: '#0BA730',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#162A21',
    ContainerHover: '#162A21',
    ContainerActive: '#162A21',
    ContainerLine: '#143C23',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Warning: {
    Main: '#C5740A',
    MainHover: '#744B15',
    MainActive: '#C5740A',
    MainLine: '#C5740A',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#2D241C',
    ContainerHover: '#2D241C',
    ContainerActive: '#2D241C',
    ContainerLine: '#432F19',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Critical: {
    Main: '#D24524',
    MainHover: '#7B3223',
    MainActive: '#D24524',
    MainLine: '#D24524',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#2F1D1D',
    ContainerHover: '#2F1D1D',
    ContainerActive: '#2F1D1D',
    ContainerLine: '#47221E',
    OnContainer: 'rgba(255, 255, 255, 0.85)',
  },

  Other: {
    FocusRing: 'rgba(255, 255, 255, 0.5)',
    Shadow: 'rgba(0, 0, 0, 1)',
    Overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

export const darkTheme = createTheme(color, darkThemeData);
