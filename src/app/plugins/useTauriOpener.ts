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
  'easyops.local',
  'elevo.vip',
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

function sanitizeRoomId(roomId: string): string {
  return roomId.replace(/[^a-zA-Z0-9_/:-]/g, '_');
}

function labelFromUrl(href: string, roomId: string): string {
  const roomIdSafe = sanitizeRoomId(roomId);
  try {
    const { hostname, port } = new URL(href);
    // Use a stable label per room + hostname + port so repeated clicks reuse the same window.
    return `room-${roomIdSafe}-${hostname.replace(/\./g, '-')}-${port}`;
  } catch {
    return `room-${roomIdSafe}-${Date.now()}`;
  }
}

/**
 * Open a URL in a side panel docked to the right of the main window.
 * The Rust backend handles the layout: exits fullscreen, resizes/repositions
 * the main window, and places the panel at 1/3 screen width on the right.
 * Falls back to system browser on non-desktop or non-allowlisted domains.
 *
 * @param href - The URL to open in the side panel.
 * @param roomId - The room ID associated with this side panel.
 * @param label - Optional custom webview label. If omitted, a label is
 *   derived from the URL and roomId.
 */
function openSidePanel(href: string, roomId: string, label?: string): void {
  if (isDesktopTauri && isDomainAllowed(href)) {
    invoke('open_side_panel', { url: href, label: label ?? labelFromUrl(href, roomId), roomId }).catch(
      (error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to open side panel, falling back to system browser:', error);
        window.open(href, '_blank', 'noopener,noreferrer');
      }
    );
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

/** Open a workspace explorer side panel with label `workspaces-{ROOM_ID}`. */
export function openWorkspacePanel(href: string, roomId: string): void {
  openSidePanel(href, roomId, `workspaces-${sanitizeRoomId(roomId)}`);
}

/** Open a task management side panel with label `tasks-{ROOM_ID}`. */
export function openTasksPanel(href: string, roomId: string): void {
  openSidePanel(href, roomId, `tasks-${sanitizeRoomId(roomId)}`);
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
