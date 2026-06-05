import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ChevronLeftIcon } from './app/icons/ChevronLeftIcon';
import { ChevronRightIcon } from './app/icons/ChevronRightIcon';
import { GlobeIcon } from './app/icons/GlobeIcon';
import { RefreshCwIcon } from './app/icons/RefreshCwIcon';
import { ShieldBanIcon } from './app/icons/ShieldBanIcon';
import { ShieldCheckIcon } from './app/icons/ShieldCheckIcon';
import { WindowCloseIcon } from './app/icons/WindowCloseIcon';
import { WindowMaximizeIcon } from './app/icons/WindowMaximizeIcon';
import { WindowMinimizeIcon } from './app/icons/WindowMinimizeIcon';
import { WindowRestoreIcon } from './app/icons/WindowRestoreIcon';
import './webviewTitlebar.css';

type WebviewTitlebarState = {
  label: string;
  title: string;
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
};

declare global {
  interface Window {
    __ElevoWebviewTitlebar_initialState__?: WebviewTitlebarState;
    __ElevoWebviewTitlebar_receive__?: (state: WebviewTitlebarState) => void;
  }
}

const DEFAULT_STATE: WebviewTitlebarState = {
  label: '',
  title: '',
  url: '',
  canGoBack: false,
  canGoForward: false,
};

const isMacOS = () => /Mac OS|Macintosh|MacIntel/.test(window.navigator.userAgent);

function TitlebarIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {children}
    </svg>
  );
}

function IconButton({
  label,
  disabled,
  children,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="WebviewTitlebar-button"
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WindowControls({ label }: { label: string }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!label) return undefined;

    let cancelled = false;
    const updateMaximized = () => {
      invoke<boolean>('webview_titlebar_is_maximized', { label })
        .then((value) => {
          if (!cancelled) setMaximized(value);
        })
        .catch((error) => {
          console.error('[webview-titlebar] is_maximized failed:', error);
        });
    };
    updateMaximized();

    const unlistenPromise = listen<WebviewTitlebarState>('webview-titlebar-state', (event) => {
      if (event.payload.label === label) updateMaximized();
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [label]);

  const runWindowCommand = useCallback(
    (command: string) => {
      if (!label) return;
      invoke(command, { label }).catch((error) => {
        console.error(`[webview-titlebar] ${command} failed:`, error);
      });
    },
    [label],
  );

  if (isMacOS()) return <div className="WebviewTitlebar-trafficLightSpacer" />;

  return (
    <div className="WebviewTitlebar-windowControls">
      <button
        className="WebviewTitlebar-windowButton"
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={() => runWindowCommand('webview_titlebar_minimize')}
      >
        <TitlebarIcon size={14}>
          <WindowMinimizeIcon />
        </TitlebarIcon>
      </button>
      <button
        className="WebviewTitlebar-windowButton"
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => runWindowCommand('webview_titlebar_toggle_maximize')}
      >
        <TitlebarIcon size={14}>
          {maximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
        </TitlebarIcon>
      </button>
      <button
        className="WebviewTitlebar-windowButton WebviewTitlebar-closeButton"
        type="button"
        aria-label="Close"
        title="Close"
        onClick={() => runWindowCommand('webview_titlebar_close')}
      >
        <TitlebarIcon size={14}>
          <WindowCloseIcon />
        </TitlebarIcon>
      </button>
    </div>
  );
}

const isLocalhost = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  hostname === '::1';

function SecurityIcon({ url }: { url: string }) {
  const security = useMemo(() => {
    try {
      const parsed = new URL(url);

      if (parsed.protocol === 'https:') return 'secure';
      if (parsed.protocol === 'http:' && !isLocalhost(parsed.hostname)) return 'insecure';
    } catch {
      return 'default';
    }

    return 'default';
  }, [url]);

  if (security === 'secure') {
    return (
      <span className="WebviewTitlebar-securityIcon" title="Secure connection">
        <TitlebarIcon>
          <ShieldCheckIcon />
        </TitlebarIcon>
      </span>
    );
  }

  if (security === 'insecure') {
    return (
      <span
        className="WebviewTitlebar-securityIcon WebviewTitlebar-securityIconInsecure"
        title="Insecure connection"
      >
        <TitlebarIcon>
          <ShieldBanIcon />
        </TitlebarIcon>
      </span>
    );
  }

  return (
    <span className="WebviewTitlebar-securityIcon" title="Connection">
      <TitlebarIcon>
        <GlobeIcon />
      </TitlebarIcon>
    </span>
  );
}

function WebviewTitlebar() {
  const [state, setState] = useState<WebviewTitlebarState>(
    window.__ElevoWebviewTitlebar_initialState__ ?? DEFAULT_STATE,
  );
  const label = state.label;
  const title = useMemo(() => state.title || 'Loading', [state.title]);

  useEffect(() => {
    document.body.classList.add('WebviewTitlebarBody');
    window.__ElevoWebviewTitlebar_receive__ = setState;

    let cancelled = false;
    const unlistenPromise = listen<WebviewTitlebarState>('webview-titlebar-state', (event) => {
      if (!cancelled && event.payload.label === label) {
        setState(event.payload);
      }
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [label]);

  const runCommand = (command: string) => {
    if (!label) return;
    invoke(command, { label }).catch((error) => {
      console.error(`[webview-titlebar] ${command} failed:`, error);
    });
  };

  return (
    <div className="WebviewTitlebar">
      {isMacOS() ? <div className="WebviewTitlebar-trafficLightSpacer" /> : null}
      <IconButton
        label="Back"
        disabled={!state.canGoBack}
        onClick={() => runCommand('webview_titlebar_go_back')}
      >
        <TitlebarIcon size={18}>
          <ChevronLeftIcon />
        </TitlebarIcon>
      </IconButton>
      <IconButton
        label="Forward"
        disabled={!state.canGoForward}
        onClick={() => runCommand('webview_titlebar_go_forward')}
      >
        <TitlebarIcon size={18}>
          <ChevronRightIcon />
        </TitlebarIcon>
      </IconButton>
      <IconButton label="Refresh" onClick={() => runCommand('webview_titlebar_reload')}>
        <TitlebarIcon size={17}>
          <RefreshCwIcon />
        </TitlebarIcon>
      </IconButton>
      <div className="WebviewTitlebar-title" title={title}>
        <SecurityIcon url={state.url} />
        <span className="WebviewTitlebar-titleText">{title}</span>
      </div>
      <WindowControls label={label} />
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<WebviewTitlebar />);
