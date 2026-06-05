import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './webviewTitlebar.css';

type WebviewTitlebarState = {
  label: string;
  title: string;
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
  canGoBack: false,
  canGoForward: false,
};

const isMacOS = () => /Mac OS|Macintosh|MacIntel/.test(window.navigator.userAgent);

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

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="m15 18-6-6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="m9 18 6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path
        d="M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.74-2.74L3 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.74 2.74L21 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21v-5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 12h20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true">
      <rect width="10" height="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <rect x="0.5" y="2.5" width="7" height="7" />
      <polyline points="2.5,2.5 2.5,0.5 9.5,0.5 9.5,7.5 7.5,7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M1.41 0L5 3.59L8.59 0L10 1.41L6.41 5L10 8.59L8.59 10L5 6.41L1.41 10L0 8.59L3.59 5L0 1.41L1.41 0Z" />
    </svg>
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
        <MinimizeIcon />
      </button>
      <button
        className="WebviewTitlebar-windowButton"
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => runWindowCommand('webview_titlebar_toggle_maximize')}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        className="WebviewTitlebar-windowButton WebviewTitlebar-closeButton"
        type="button"
        aria-label="Close"
        title="Close"
        onClick={() => runWindowCommand('webview_titlebar_close')}
      >
        <CloseIcon />
      </button>
    </div>
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
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        label="Forward"
        disabled={!state.canGoForward}
        onClick={() => runCommand('webview_titlebar_go_forward')}
      >
        <ChevronRightIcon />
      </IconButton>
      <IconButton label="Refresh" onClick={() => runCommand('webview_titlebar_reload')}>
        <RefreshIcon />
      </IconButton>
      <div className="WebviewTitlebar-title" title={title}>
        <GlobeIcon />
        <span className="WebviewTitlebar-titleText">{title}</span>
      </div>
      <WindowControls label={label} />
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<WebviewTitlebar />);
