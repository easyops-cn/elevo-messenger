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
    ContainerHover: '#BDE1FF',
    ContainerActive: '#BDE1FF',
    ContainerLine: '#6BB3FF',
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
    Main: '#00844C',
    MainHover: '#007744',
    MainActive: '#007041',
    MainLine: '#006A3D',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#E5F3ED',
    ContainerHover: '#D9EDE4',
    ContainerActive: '#CCE6DB',
    ContainerLine: '#BFE0D2',
    OnContainer: '#005C35',
  },

  Warning: {
    Main: '#A85400',
    MainHover: '#974C00',
    MainActive: '#8F4700',
    MainLine: '#864300',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#F6EEE5',
    ContainerHover: '#F2E5D9',
    ContainerActive: '#EEDDCC',
    ContainerLine: '#E9D4BF',
    OnContainer: '#763B00',
  },

  Critical: {
    Main: '#C40E0E',
    MainHover: '#AC0909',
    MainActive: '#A60C0C',
    MainLine: '#9C0B0B',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#F9E7E7',
    ContainerHover: '#F6DBDB',
    ContainerActive: '#F3CFCF',
    ContainerLine: '#F0C3C3',
    OnContainer: '#890A0A',
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
    MainHover: '#0A84FF',
    MainActive: '#0A84FF',
    MainLine: '#0A84FF',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#162437',
    ContainerHover: '#142F4F',
    ContainerActive: '#142F4F',
    ContainerLine: '#134B85',
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
    Main: '#85E0BA',
    MainHover: '#70DBAF',
    MainActive: '#66D9A9',
    MainLine: '#5CD6A3',
    OnMain: '#0F3D2A',
    Container: '#175C3F',
    ContainerHover: '#1A6646',
    ContainerActive: '#1C704D',
    ContainerLine: '#1F7A54',
    OnContainer: '#CCF2E2',
  },

  Warning: {
    Main: '#E3BA91',
    MainHover: '#DFAF7E',
    MainActive: '#DDA975',
    MainLine: '#DAA36C',
    OnMain: '#3F2A15',
    Container: '#5E3F20',
    ContainerHover: '#694624',
    ContainerActive: '#734D27',
    ContainerLine: '#7D542B',
    OnContainer: '#F3E2D1',
  },

  Critical: {
    Main: '#DD1A6C',
    MainHover: '#DD1A6C',
    MainActive: '#DD1A6C',
    MainLine: '#DD1A6C',
    OnMain: 'rgba(255, 255, 255, 0.85)',
    Container: '#602929',
    ContainerHover: '#6B2E2E',
    ContainerActive: '#763333',
    ContainerLine: '#803737',
    OnContainer: '#F5D6D6',
  },

  Other: {
    FocusRing: 'rgba(255, 255, 255, 0.5)',
    Shadow: 'rgba(0, 0, 0, 1)',
    Overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

export const darkTheme = createTheme(color, darkThemeData);
