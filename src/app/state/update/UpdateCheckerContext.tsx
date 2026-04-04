import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  checkAndPrepare: () => Promise<void>;
  applyUpdate: () => Promise<void>;
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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  checkAndPrepare: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  applyUpdate: async () => {},
});

export function useUpdateChecker() {
  return useContext(UpdateCheckerContext);
}

// Simple event emitter so the SettingsTab can listen for "open about" requests.
type OpenAboutListener = () => void;
const openAboutListeners = new Set<OpenAboutListener>();

export function onOpenAbout(listener: OpenAboutListener): () => void {
  openAboutListeners.add(listener);
  return () => {
    openAboutListeners.delete(listener);
  };
}

function emitOpenAbout() {
  openAboutListeners.forEach((fn) => fn());
}

export function UpdateCheckerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpdateState>(initial);
  const checkingRef = useRef(false);
  const pendingUpdateRef = useRef<Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>> | null>(null);

  const checkAndPrepare = useCallback(async () => {
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

      const {version} = update;
      const body = update.body ?? null;

      const isWindows = navigator.userAgent.includes('Windows');

      if (isWindows) {
        // On Windows, do NOT auto-download. Just notify the user that an update is available.
        // The user will confirm, then download + install + restart all at once.
        pendingUpdateRef.current = update;
        setState((s) => ({
          ...s,
          checking: false,
          updateAvailable: true,
          version,
          body,
        }));
        return;
      }

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

      const onEvent = (event: { event: 'Started'; data: { contentLength?: number } } | { event: 'Progress'; data: { chunkLength: number } } | { event: 'Finished' }) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setState((s) => ({
              ...s,
              progress: { downloaded, total },
            }));
            break;
          default:
            break;
        }
      };

      await update.downloadAndInstall(onEvent);

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

  const applyUpdate = useCallback(async () => {
    if (!isDesktopTauri) return;
    const pendingUpdate = pendingUpdateRef.current;
    if (pendingUpdate) {
      // Windows: download + install + restart all at once after user confirmation.
      setState((s) => ({ ...s, downloading: true }));

      let downloaded = 0;
      let total = 0;

      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setState((s) => ({
              ...s,
              progress: { downloaded, total },
            }));
            break;
          default:
            break;
        }
      });

      pendingUpdateRef.current = null;
      setState((s) => ({
        ...s,
        downloading: false,
        updateDownloaded: true,
        progress: { downloaded, total },
      }));
    }
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }, []);

  // Listen for "check-for-updates" event from Rust (menu click or silent startup check).
  useEffect(() => {
    if (!isDesktopTauri) return;

    let cancelled = false;
    const unlistenPromise = listen<{ openSettings: boolean }>(
      'check-for-updates',
      (event) => {
        if (cancelled) return;
        if (event.payload.openSettings) {
          emitOpenAbout();
        }
        checkAndPrepare();
      }
    );

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => {
        if (cancelled) unlisten();
      });
    };
  }, [checkAndPrepare]);

  const value = useMemo<UpdateCheckerContextValue>(() => ({
    ...state,
    checkAndPrepare,
    applyUpdate,
  }), [checkAndPrepare, applyUpdate, state])

  return (
    <UpdateCheckerContext.Provider value={value}>
      {children}
    </UpdateCheckerContext.Provider>
  );
}
