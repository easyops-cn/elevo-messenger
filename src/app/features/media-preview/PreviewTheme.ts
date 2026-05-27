import { varsClass } from 'folds';
import { elevoConfig } from '../../../config.css';
import { DarkTheme, LightTheme, ThemeKind } from '../../hooks/useTheme';

export function applyPreviewTheme(themeKind: string): void {
  document.body.className = '';
  document.body.classList.add(elevoConfig, varsClass);

  if (themeKind === ThemeKind.Dark) {
    document.body.classList.add(...DarkTheme.classNames);
    return;
  }

  document.body.classList.add(...LightTheme.classNames);
}
