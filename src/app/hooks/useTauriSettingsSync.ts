import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { settingsAtom, getSettings } from '../state/settings';
import { getTauriSettings, setTauriSettings } from '../state/utils/tauriStore';
import { isDesktopTauri } from '../plugins/useTauriOpener';
import type { Settings } from '../state/settings';

export function useTauriSettingsSync(): void {
  const setSettings = useSetAtom(settingsAtom);

  useEffect(() => {
    if (!isDesktopTauri) return;

    let cancelled = false;

    (async () => {
      try {
        const tauriSettings = await getTauriSettings<Settings>();
        if (cancelled) return;

        if (tauriSettings != null) {
          const defaults = getSettings();
          const merged: Settings = { ...defaults, ...tauriSettings };
          setSettings(merged);
        } else {
          const currentSettings = getSettings();
          await setTauriSettings(currentSettings);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[settings] Tauri Store hydration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setSettings]);
}
