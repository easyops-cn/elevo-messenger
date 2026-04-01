import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { isDesktopTauri } from './useTauriOpener';

// The custom URI scheme registered in tauri.conf.json (plugins.deep-link.desktop.schemes).
export const DEEP_LINK_SCHEME = 'vip.elevo.messenger';

// Path prefix used for SSO callback deep links.
// Format: vip.elevo.messenger://sso-callback/login/{server}/?loginToken=xxx
export const SSO_CALLBACK_HOST = 'sso-callback';

/**
 * Dispatches an incoming deep link URL to the appropriate handler.
 *
 * This is the central extensibility point: add new `if` branches here as
 * new deep link features are introduced (room links, invites, etc.).
 */
function handleDeepLink(rawUrl: string, navigate: ReturnType<typeof useNavigate>) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // eslint-disable-next-line no-console
    console.warn('[useTauriDeepLink] Received invalid deep link URL:', rawUrl);
    return;
  }

  if (parsed.protocol !== `${DEEP_LINK_SCHEME}:`) return;

  if (parsed.hostname === SSO_CALLBACK_HOST) {
    // vip.elevo.messenger://sso-callback/login/{server}/?loginToken=xxx
    // Reconstruct a React Router path: /login/{server}/?loginToken=xxx
    const loginToken = parsed.searchParams.get('loginToken');
    if (!loginToken) {
      // eslint-disable-next-line no-console
      console.warn('[useTauriDeepLink] SSO callback URL missing loginToken:', rawUrl);
      return;
    }
    const routePath = `${parsed.pathname}?loginToken=${encodeURIComponent(loginToken)}`;
    navigate(routePath, { replace: true });
    return;
  }

  // Future deep link types: add handlers here.
  // e.g. if (parsed.hostname === 'room') { ... }
  // eslint-disable-next-line no-console
  console.warn('[useTauriDeepLink] Unhandled deep link:', rawUrl);
}

/**
 * Listen for deep links delivered to the running app via Tauri's deep-link plugin.
 *
 * Handles two cases:
 * 1. App already running: the backend emits a `"deep-link-received"` event when the
 *    OS delivers a new deep link URL.
 * 2. Cold-start: `getCurrent()` returns URLs that launched the app; processed once
 *    on mount.
 *
 * Mount this hook at the top-level router so `useNavigate` is available for all routes.
 */
export function useTauriDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktopTauri) return undefined;

    // Handle cold-start deep links (app launched via a deep link URL).
    import('@tauri-apps/plugin-deep-link').then(({ getCurrent }) => {
      getCurrent().then((urls: string[] | null) => {
        if (urls) {
          urls.forEach((url) => handleDeepLink(url, navigate));
        }
      });
    });

    // Handle deep links while the app is already running.
    const unlistenPromise = listen<string>('deep-link-received', (event) => {
      handleDeepLink(event.payload, navigate);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
    // navigate is stable across renders; no real dep change expected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
