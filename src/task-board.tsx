import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Box, varsClass } from 'folds';
import 'folds/dist/style.css';
import './index.css';
import './preview.css';
import './app/i18n';
import { elevoConfig } from './config.css';
import { DarkTheme, LightTheme, ThemeContextProvider, ThemeKind } from './app/hooks/useTheme';
import { TaskBoard } from './app/features/task-board/TaskBoard';
import { onSdkMessage } from './app/features/bridge-explorer/sdkBridge';
import type { TaskBoardPayload } from './app/features/task-board/types';
import * as css from './previewStyles.css';

declare global {
  interface Window {
    __ElevoTaskBoard_initialTheme__?: ThemeKind;
    __ElevoTaskBoard_initialPayload__?: TaskBoardPayload;
    __ElevoMessengerSDK_receive__?: (channel: string, data: unknown) => void;
  }
}

const applyTheme = (themeKind: ThemeKind) => {
  document.body.className = '';
  document.body.classList.add(elevoConfig, varsClass, css.PreviewBody);
  document.body.classList.add(
    ...(themeKind === ThemeKind.Dark ? DarkTheme.classNames : LightTheme.classNames),
  );
};

const closeWindow = () => {
  getCurrentWindow().close();
};

function TaskBoardTheme({ children }: { children: React.ReactNode }) {
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    window.__ElevoTaskBoard_initialTheme__ === ThemeKind.Dark ? ThemeKind.Dark : ThemeKind.Light,
  );
  const theme = themeKind === ThemeKind.Dark ? DarkTheme : LightTheme;

  useEffect(() => {
    applyTheme(themeKind);
  }, [themeKind]);

  useEffect(
    () =>
      onSdkMessage('theme_change', (data) => {
        if (data === ThemeKind.Light || data === ThemeKind.Dark) {
          setThemeKind(data);
        }
      }),
    [],
  );

  return <ThemeContextProvider value={theme}>{children}</ThemeContextProvider>;
}

function TaskBoardApp() {
  const [payload] = useState<TaskBoardPayload | undefined>(
    window.__ElevoTaskBoard_initialPayload__,
  );

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      evt.preventDefault();
      closeWindow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <TaskBoardTheme>
      <Box className={css.PreviewShell} direction="Column">
        {payload ? <TaskBoard payload={payload} /> : null}
      </Box>
    </TaskBoardTheme>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<TaskBoardApp />);
