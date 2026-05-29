import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Box, varsClass } from 'folds';
import 'folds/dist/style.css';
import './index.css';
import './preview.css';
import './app/i18n';
import { loadMediaBlob, loadMediaFilePath } from './app/utils/mediaDownload';
import type { DesktopPreviewPayload } from './app/utils/desktopPreview';
import { elevoConfig } from './config.css';
import { DarkTheme, LightTheme, ThemeContextProvider, ThemeKind } from './app/hooks/useTheme';
import { FilePreview, type FilePreviewItem } from './app/components/file-preview';
import * as css from './previewStyles.css';

declare global {
  interface Window {
    __ElevoPreview_initialTheme__?: ThemeKind;
    __ElevoPreview_initialPayload__?: DesktopPreviewPayload;
    __ElevoPreview_receive__?: (payload: DesktopPreviewPayload) => void;
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

const closePreviewWindow = () => {
  getCurrentWindow().close();
};

function PreviewTheme({ children }: { children: React.ReactNode }) {
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    window.__ElevoPreview_initialTheme__ === ThemeKind.Dark ? ThemeKind.Dark : ThemeKind.Light,
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

function PreviewApp() {
  const [payload, setPayload] = useState<DesktopPreviewPayload | undefined>(
    window.__ElevoPreview_initialPayload__,
  );
  const previewItem = useMemo<FilePreviewItem | undefined>(() => {
    if (!payload) return undefined;
    return {
      viewerType: payload.viewerType,
      name: payload.name,
      mimeType: payload.mimeType,
      size: payload.size,
      duration: payload.duration,
      waveform: payload.waveform,
      langName: payload.langName,
      loadBlob: () =>
        loadMediaBlob(payload.mediaUrl, payload.mimeType, payload.encInfo, payload.createdAt),
      loadFilePath: () =>
        loadMediaFilePath(payload.mediaUrl, payload.mimeType, payload.encInfo, payload.createdAt),
    };
  }, [payload]);

  useEffect(() => {
    window.__ElevoPreview_receive__ = setPayload;
  }, []);

  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key !== 'Escape') return;
      evt.preventDefault();
      closePreviewWindow();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PreviewTheme>
      <Box className={css.PreviewShell} direction="Column">
        {previewItem ? (
          <FilePreview
            key={`${payload?.mediaUrl}:${payload?.name}`}
            className={css.PreviewShell}
            item={previewItem}
            hideCloseButton
            downloadAction="open-folder"
            requestClose={closePreviewWindow}
          />
        ) : null}
      </Box>
    </PreviewTheme>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<PreviewApp />);
