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
import { BridgeExplorer } from './app/features/bridge-explorer/BridgeExplorer';
import { onSdkMessage } from './app/features/bridge-explorer/sdkBridge';
import type { BridgeExplorerPayload } from './app/features/bridge-explorer/types';
import * as css from './previewStyles.css';

declare global {
  interface Window {
    __ElevoBridgeExplorer_initialTheme__?: ThemeKind;
    __ElevoBridgeExplorer_initialPayload__?: BridgeExplorerPayload;
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

function BridgeExplorerTheme({ children }: { children: React.ReactNode }) {
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    window.__ElevoBridgeExplorer_initialTheme__ === ThemeKind.Dark
      ? ThemeKind.Dark
      : ThemeKind.Light,
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

function BridgeExplorerApp() {
  const [payload] = useState<BridgeExplorerPayload | undefined>(
    window.__ElevoBridgeExplorer_initialPayload__,
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
    <BridgeExplorerTheme>
      <Box className={css.PreviewShell} direction="Column">
        {payload ? <BridgeExplorer payload={payload} /> : null}
      </Box>
    </BridgeExplorerTheme>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<BridgeExplorerApp />);
