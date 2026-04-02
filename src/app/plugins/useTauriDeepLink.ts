import { useEffect } from 'react';
import { isDesktopTauri } from './useTauriOpener';

// The custom URI scheme registered in tauri.conf.json (plugins.deep-link.desktop.schemes).
export const DEEP_LINK_SCHEME = 'vip.elevo.messenger';

/**
 * Listen for deep links delivered to the running app via Tauri's deep-link plugin.
 *
 * Currently a no-op placeholder — SSO/OIDC callbacks are handled in-page
 * without deep links. Re-enable specific handlers here when deep links
 * are needed for other features (room links, invites, etc.).
 */
export function useTauriDeepLink() {
  const _isDesktop = isDesktopTauri;
  useEffect(() => {
    if (!_isDesktop) return undefined;
    // Future deep link types: add handlers here.
    return undefined;
  }, [_isDesktop]);
}
