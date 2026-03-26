import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { mobileOrTablet } from '../utils/user-agent';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
// Desktop = running inside Tauri on a non-mobile OS.
// Mobile (iOS/Android) will use a different code path in the future.
export const isDesktopTauri = isTauri && !mobileOrTablet();

// Domains whose links open in an in-app WebviewWindow with the ElevoMessengerSDK injected.
// Keep in sync with ALLOWED_DOMAINS in src-tauri/src/lib.rs.
// Replace placeholders with real domains before shipping.
const ALLOWED_DOMAINS: string[] = [
  'localhost',
];

function isDomainAllowed(href: string): boolean {
  try {
    const { hostname } = new URL(href);
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

function labelFromUrl(href: string, roomId: string): string {
  const roomIdSafe = roomId.replace(/[^a-zA-Z0-9_/:-]/g, '_');
  try {
    const { hostname, port } = new URL(href);
    // Use a stable label per room + hostname + port so repeated clicks reuse the same window.
    return `room-${roomIdSafe}-${hostname.replace(/\./g, '-')}-${port}`;
  } catch {
    return `room-${roomIdSafe}-${Date.now()}`;
  }
}

async function openInSystemBrowser(href: string) {
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  openUrl(href);
}

/**
 * Programmatically open a URL, respecting the Tauri environment:
 * - Tauri desktop + allowed domain → opens in an in-app WebviewWindow with ElevoMessengerSDK
 * - Tauri desktop + other domain  → opens in the system browser
 * - Web browser                   → falls through to window.open
 *
 * Use this for JS-triggered navigation that isn't driven by an <a target="_blank"> click.
 */
export function openExternalUrl(href: string, roomId: string): void {
  if (isDesktopTauri) {
    if (isDomainAllowed(href)) {
      invoke('open_webview', { url: href, label: labelFromUrl(href, roomId), roomId }).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to open link in webview, falling back to system browser:', error);
        openInSystemBrowser(href);
      });
    } else {
      openInSystemBrowser(href);
    }
  } else if (isTauri) {
    // Mobile Tauri (future): use system browser for now.
    openInSystemBrowser(href);
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

export function useTauriOpener(roomId: string) {
  useEffect(() => {
    if (!isTauri) return undefined;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const target = anchor.getAttribute('target');
      if (!(href && /^https?:\/\//.test(href) && (target === '_blank' || href.startsWith("http://localhost:5173/")))) return;

      e.preventDefault();

      if (isDesktopTauri && isDomainAllowed(href)) {
        // Open in an in-app WebviewWindow with ElevoMessengerSDK injected.
        invoke('open_webview', { url: href, label: labelFromUrl(href, roomId), roomId }).catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Failed to open link in webview, falling back to system browser:', error);
          // Fallback to system browser if the command fails.
          openInSystemBrowser(href);
        });
      } else {
        // Non-allowlisted domains, or mobile (future): use system browser.
        // TODO(mobile): replace with tauri-plugin-inappbrowser when available.
        openInSystemBrowser(href);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [roomId]);
}

export type SdkMessagePayload<T = unknown> = {
  source: string;
  roomId: string;
  channel: string;
  data: T;
};

/**
 * Listen for messages sent by a child webview via `elevoMessengerSDK.sendMessage()`.
 *
 * On mobile (future), this hook is a no-op – the mobile in-app browser will
 * deliver messages via a different mechanism while keeping the same API shape.
 */
/**
 * Sync the active theme kind to the Tauri backend so it can be injected into
 * newly opened webviews and broadcast to already-open ones via `theme_change`.
 */
export function useTauriThemeSync(themeKind: string) {
  useEffect(() => {
    if (!isDesktopTauri) return;
    invoke('set_theme', { themeKind }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[useTauriThemeSync] set_theme failed:', e);
    });
  }, [themeKind]);
}

export function useSdkMessageListener<T = unknown>(
  channel: string,
  handler: (payload: SdkMessagePayload<T>) => void
) {
  useEffect(() => {
    // Mobile: no-op for now; will be wired up when mobile support is added.
    if (!isDesktopTauri) return undefined;

    let cancelled = false;
    const unlistenPromise = listen<SdkMessagePayload<T>>('elevo-messenger-sdk-message', (event) => {
      if (event.payload.channel === channel) {
        handler(event.payload);
      }
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => {
        if (cancelled) unlisten();
      });
    };
  }, [channel, handler]);
}
