import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { elevoDark, elevoLight } from '../../config.css';
import { darkTheme, lightTheme } from '../../colors.css';
import { settingsAtom } from '../state/settings';
import { useSetting } from '../state/hooks/settings';

export enum ThemeKind {
  Light = 'light',
  Dark = 'dark',
}

export type Theme = {
  id: string;
  kind: ThemeKind;
  classNames: string[];
};

export const LightTheme: Theme = {
  id: 'light-theme',
  kind: ThemeKind.Light,
  classNames: [lightTheme, elevoLight, 'prism-light'],
};

export const DarkTheme: Theme = {
  id: 'dark-theme',
  kind: ThemeKind.Dark,
  classNames: ['dark-theme', elevoDark, darkTheme, 'prism-dark'],
};

export const useThemes = (): Theme[] => {
  const themes: Theme[] = useMemo(() => [LightTheme, DarkTheme], []);

  return themes;
};

export const useThemeNames = (): Record<string, string> =>
  useMemo(
    () => ({
      [LightTheme.id]: 'Light',
      [DarkTheme.id]: 'Dark',
    }),
    []
  );

export const useSystemThemeKind = (): ThemeKind => {
  const darkModeQueryList = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)'), []);
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    darkModeQueryList.matches ? ThemeKind.Dark : ThemeKind.Light
  );

  useEffect(() => {
    const handleMediaQueryChange = () => {
      setThemeKind(darkModeQueryList.matches ? ThemeKind.Dark : ThemeKind.Light);
    };

    darkModeQueryList.addEventListener('change', handleMediaQueryChange);
    return () => {
      darkModeQueryList.removeEventListener('change', handleMediaQueryChange);
    };
  }, [darkModeQueryList, setThemeKind]);

  return themeKind;
};

export const useActiveTheme = (): Theme => {
  const systemThemeKind = useSystemThemeKind();
  const [themeMode] = useSetting(settingsAtom, 'themeMode');

  if (themeMode === 'light') {
    return LightTheme;
  }

  if (themeMode === 'dark') {
    return DarkTheme;
  }

  return systemThemeKind === ThemeKind.Dark ? DarkTheme : LightTheme;
};

const ThemeContext = createContext<Theme | null>(null);
export const ThemeContextProvider = ThemeContext.Provider;

export const useTheme = (): Theme => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('No theme provided!');
  }

  return theme;
};
