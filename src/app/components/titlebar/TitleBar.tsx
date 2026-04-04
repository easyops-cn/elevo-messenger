import React, { useCallback, useEffect, useState } from 'react';
import { useSetAtom } from 'jotai';
import { isDesktopTauri } from '../../plugins/useTauriOpener';
import * as css from './TitleBar.css';
import { isMacOS } from '../../utils/user-agent';
import { searchModalAtom } from '../../state/searchModal';

function MinimizeIcon() {
  return (
    <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
      <rect width="10" height="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2.5" y="0.5" width="7" height="7" />
      <rect x="0.5" y="2.5" width="7" height="7" />
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
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
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

function SearchIcon() {
  return (
    <svg
      className={css.SearchBoxIcon}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function TitleBarSearchBox() {
  const setSearchOpen = useSetAtom(searchModalAtom);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setSearchOpen(true);
    },
    [setSearchOpen]
  );

  const shortcutLabel = isMacOS() ? '⌘K' : 'Ctrl+K';

  return (
    <button
      type="button"
      className={css.SearchBox}
      onClick={handleClick}
      aria-label="Search"
    >
      <SearchIcon />
      <span className={css.SearchBoxText}>Search</span>
      <span className={css.SearchBoxShortcut}>{shortcutLabel}</span>
    </button>
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
      className={css.TitleBarContainer}
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
      <TitleBarSearchBox />
      {isMacOS() ? (
        <div className={css.TrafficLightSpacer} />
      ) : (
        <WindowControls />
      )}
    </div>
  );
}
