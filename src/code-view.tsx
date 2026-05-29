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
import { CodeView, type CodeViewPayload } from './app/components/code-view';
import * as css from './previewStyles.css';

declare global {
  interface Window {
    __ElevoCodeView_initialTheme__?: ThemeKind;
    __ElevoCodeView_initialPayload__?: CodeViewPayload;
    __ElevoCodeView_receive__?: (payload: CodeViewPayload) => void;
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

const closeCodeViewWindow = () => {
  getCurrentWindow().close();
};

function CodeViewTheme({ children }: { children: React.ReactNode }) {
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    window.__ElevoCodeView_initialTheme__ === ThemeKind.Dark ? ThemeKind.Dark : ThemeKind.Light,
  );
  const theme = themeKind === ThemeKind.Dark ? DarkTheme : LightTheme;

  useEffect(() => {
    applyTheme(themeKind);
  }, [themeKind]);

  useEffect(() => {
    window.__ElevoMessengerSDK_receive__ = (channel, data) => {
      if (channel === 'theme_change' && (data === ThemeKind.Light || data === ThemeKind.Dark)) {
        setThemeKind(data);
      }
    };
  }, []);

  return <ThemeContextProvider value={theme}>{children}</ThemeContextProvider>;
}

function CodeViewApp() {
  const [payload, setPayload] = useState<CodeViewPayload | undefined>(
    window.__ElevoCodeView_initialPayload__,
  );

  useEffect(() => {
    window.__ElevoCodeView_receive__ = setPayload;
  }, []);

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      evt.preventDefault();
      closeCodeViewWindow();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CodeViewTheme>
      <Box className={css.PreviewShell} direction="Column">
        {payload ? (
          <CodeView
            key={`${payload.title ?? ''}:${payload.files
              .map((file) => `${file.path}:${file.added}:${file.deleted}:${file.lines.length}`)
              .join('|')}`}
            className={css.PreviewShell}
            payload={payload}
            hideCloseButton
            requestClose={closeCodeViewWindow}
          />
        ) : null}
      </Box>
    </CodeViewTheme>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<CodeViewApp />);
