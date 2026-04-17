import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SyncStatusText } from './SyncStatusText';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import * as css from './TitleBar.css';
import { isMacOS } from '../../utils/user-agent';

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
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
    >
      <rect x="0.5" y="2.5" width="7" height="7" />
      <polyline points="2.5,2.5 2.5,0.5 9.5,0.5 9.5,7.5 7.5,7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M1.41 0L5 3.59L8.59 0L10 1.41L6.41 5L10 8.59L8.59 10L5 6.41L1.41 10L0 8.59L3.59 5L0 1.41L1.41 0Z" />
    </svg>
  );
}

async function getAppWindow() {
  return getCurrentWindow();
}

function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getAppWindow().then(async (appWindow) => {
      setMaximized(await appWindow.isMaximized());
      const unsub = await appWindow.onResized(async () => {
        setMaximized(await appWindow.isMaximized());
      });
      if (cancelled) {
        unsub();
      } else {
        unlisten = unsub;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const handleMinimize = useCallback(() => {
    getAppWindow().then((w) => w.minimize());
  }, []);

  const handleMaximize = useCallback(() => {
    getAppWindow().then((w) => w.toggleMaximize());
  }, []);

  const handleClose = useCallback(() => {
    getAppWindow().then((w) => w.close());
  }, []);

  return (
    <div className={css.WindowControls}>
      <button
        type="button"
        className={css.WindowControlButton}
        onClick={handleMinimize}
        aria-label="Minimize"
      >
        <MinimizeIcon />
      </button>
      <button
        type="button"
        className={css.WindowControlButton}
        onClick={handleMaximize}
        aria-label={maximized ? 'Restore' : 'Maximize'}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        type="button"
        className={`${css.WindowControlButton} ${css.CloseButton}`}
        onClick={handleClose}
        aria-label="Close"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

export function TitleBar() {
  const handleDoubleClick = useCallback(() => {
    if (!isMacOS()) {
      getAppWindow().then((w) => w.toggleMaximize());
    }
  }, []);

  if (!isDesktopTauri) return null;

  return (
    <div
      className={`${css.TitleBarContainer} ${isMacOS() ? css.MacTitleBar : ''}`}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {isMacOS() ? (
        <div className={css.TrafficLightSpacer} />
      ) : (
        <div className={css.LeftSection}>
          <span className={css.AppTitle}>Elevo Messenger</span>
        </div>
      )}
      {isMacOS() && <SyncStatusText side="right" />}
      {isMacOS() ? <div className={css.TrafficLightSpacer} /> : <WindowControls />}
    </div>
  );
}
