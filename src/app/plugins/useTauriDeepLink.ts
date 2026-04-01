import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { isDesktopTauri } from './useTauriOpener';

// The custom URI scheme registered in tauri.conf.json (plugins.deep-link.desktop.schemes).
export const DEEP_LINK_SCHEME = 'vip.elevo.messenger';

// Path prefix used for SSO callback deep links.
// Format: vip.elevo.messenger://sso-callback/login/{server}/?loginToken=xxx
export const SSO_CALLBACK_HOST = 'sso-callback';

// Path prefix used for OIDC authorization code callback deep links.
// Format: vip.elevo.messenger://oidc-callback?code=xxx&state=xxx
export const OIDC_CALLBACK_HOST = 'oidc-callback';

// On macOS, custom URL schemes only work for installed .app bundles, not during
// `tauri dev`. Detect macOS + dev mode and fall back to the web-based SSO flow.
const isMacOS =
  typeof navigator !== 'undefined' &&
  (/Mac/.test(navigator.platform) || /Mac/.test(navigator.userAgent));

/**
 * True when deep-link-based SSO is supported in the current environment:
 * - Any platform in production builds
 * - Windows / Linux in dev mode (register_all() works at runtime)
 * - macOS in dev mode: FALSE — schemes are not registered for non-installed apps
 */
export const canUseDeepLinkSSO: boolean = isDesktopTauri && !(isMacOS && import.meta.env.DEV);

// ── Stale-URL deduplication ─────────────────────────────────────────────────
//
// `getCurrent()` from the deep-link plugin returns the URL that launched the
// app and keeps returning it even after the page is reloaded (e.g. on logout).
// We store each processed URL in sessionStorage so we don't re-process a
// loginToken after logout + reload.
const PROCESSED_DL_KEY = '__elevo_last_deep_link__';

function markDeepLinkProcessed(url: string) {
  try {
    sessionStorage.setItem(PROCESSED_DL_KEY, url);
  } catch {
    // sessionStorage unavailable — ignore
  }
}

function wasDeepLinkProcessed(url: string): boolean {
  try {
    return sessionStorage.getItem(PROCESSED_DL_KEY) === url;
  } catch {
    return false;
  }
}

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

  if (parsed.hostname === OIDC_CALLBACK_HOST) {
    // vip.elevo.messenger://oidc-callback?code=xxx&state=xxx
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');
    if (!code || !state) {
      // eslint-disable-next-line no-console
      console.warn('[useTauriDeepLink] OIDC callback URL missing code or state:', rawUrl);
      return;
    }
    navigate(
      `/oidc-callback/?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { replace: true }
    );
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
    // `getCurrent()` returns the cached URL even after `window.location.reload()`,
    // so we guard against re-processing the same URL across logout + reload cycles.
    import('@tauri-apps/plugin-deep-link').then(({ getCurrent }) => {
      getCurrent().then((urls: string[] | null) => {
        if (urls) {
          urls.forEach((url) => {
            if (!wasDeepLinkProcessed(url)) {
              markDeepLinkProcessed(url);
              handleDeepLink(url, navigate);
            }
          });
        }
      });
    });

    // Handle deep links while the app is already running.
    const unlistenPromise = listen<string>('deep-link-received', (event) => {
      // Mark as processed so getCurrent() doesn't replay it after the next reload.
      markDeepLinkProcessed(event.payload);
      handleDeepLink(event.payload, navigate);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
    // navigate is stable across renders; no real dep change expected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
