import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isDesktopTauri } from '../../plugins/useTauriOpener';

type UpdateProgress = {
  downloaded: number;
  total: number;
};

type UpdateState = {
  updateAvailable: boolean;
  updateDownloaded: boolean;
  downloading: boolean;
  checking: boolean;
  checked: boolean;
  version: string | null;
  body: string | null;
  progress: UpdateProgress | null;
  error: string | null;
};

type UpdateCheckerContextValue = UpdateState & {
  checkAndDownload: () => Promise<void>;
  installAndRelaunch: () => Promise<void>;
};

const initial: UpdateState = {
  updateAvailable: false,
  updateDownloaded: false,
  downloading: false,
  checking: false,
  checked: false,
  version: null,
  body: null,
  progress: null,
  error: null,
};

const UpdateCheckerContext = React.createContext<UpdateCheckerContextValue>({
  ...initial,
  checkAndDownload: async () => {},
  installAndRelaunch: async () => {},
});

export function useUpdateChecker() {
  return useContext(UpdateCheckerContext);
}

export function UpdateCheckerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpdateState>(initial);
  const checkingRef = useRef(false);

  const checkAndDownload = useCallback(async () => {
    if (!isDesktopTauri || checkingRef.current) return;
    checkingRef.current = true;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');

      setState((s) => ({ ...s, checking: true, checked: false, error: null }));
      const update = await check();

      if (!update) {
        setState((s) => ({ ...s, checking: false, checked: true, updateAvailable: false, updateDownloaded: false, downloading: false, error: null }));
        checkingRef.current = false;
        return;
      }

      const version = update.version;
      const body = update.body ?? null;

      setState((s) => ({
        ...s,
        checking: false,
        updateAvailable: true,
        version,
        body,
        downloading: true,
      }));

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setState((s) => ({
              ...s,
              progress: { downloaded, total },
            }));
            break;
          case 'Finished':
            break;
        }
      });

      setState((s) => ({
        ...s,
        downloading: false,
        updateDownloaded: true,
        progress: { downloaded, total },
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        checking: false,
        downloading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const installAndRelaunch = useCallback(async () => {
    if (!isDesktopTauri) return;
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }, []);

  // Listen for silent update events from Rust startup check.
  useEffect(() => {
    if (!isDesktopTauri) return;

    let cancelled = false;
    const unlistenPromise = listen<{
      version: string;
      body: string;
      date?: string;
      currentVersion: string;
    }>('update-available', (event) => {
      if (cancelled) return;
      setState((s) => ({
        ...s,
        updateAvailable: true,
        version: event.payload.version,
        body: event.payload.body,
      }));
      // Auto-download after receiving the event.
      checkAndDownload();
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => {
        if (cancelled) unlisten();
      });
    };
  }, [checkAndDownload]);

  const value: UpdateCheckerContextValue = {
    ...state,
    checkAndDownload,
    installAndRelaunch,
  };

  return (
    <UpdateCheckerContext.Provider value={value}>
      {children}
    </UpdateCheckerContext.Provider>
  );
}
