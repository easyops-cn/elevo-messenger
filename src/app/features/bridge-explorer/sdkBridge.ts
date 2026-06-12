// Minimal SDK bridge for the bridge-explorer window.
//
// The explorer is a standalone webview (not the full webview-sdk.js child), so
// it owns `window.__ElevoMessengerSDK_receive__` directly. This module
// multiplexes that single global receiver across multiple channel handlers
// (theme, token refresh, ...) and provides a helper to send a message to the
// main window via the Tauri `relay_sdk_message` command.

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

type Handler = (data: unknown) => void;

/**
 * Channel used by the main window to ask an already-open bridge explorer window
 * to select (switch to) a specific file path. Must stay in sync with the Rust
 * backend (`open_bridge_explorer_window`).
 */
export const BRIDGE_EXPLORER_SELECT_FILE_CHANNEL = 'bridge-explorer-select-file';

const handlers = new Map<string, Set<Handler>>();
let installed = false;

function install(): void {
  if (installed) return;
  installed = true;
  const prev = window.__ElevoMessengerSDK_receive__;
  window.__ElevoMessengerSDK_receive__ = (channel: string, data: unknown) => {
    // Preserve any previously installed receiver (defensive).
    prev?.(channel, data);
    handlers.get(channel)?.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error('[bridge-explorer] sdk handler error', e);
      }
    });
  };
}

/** Subscribe to messages on a channel from the main window. Returns an unsubscribe fn. */
export function onSdkMessage(channel: string, handler: Handler): () => void {
  install();
  let set = handlers.get(channel);
  if (!set) {
    set = new Set();
    handlers.set(channel, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

/** Send a message to the main window via the SDK relay. */
export async function sendSdkMessage(channel: string, data: unknown): Promise<void> {
  await invoke('relay_sdk_message', {
    sourceLabel: getCurrentWindow().label,
    roomId: '',
    channel,
    data,
  });
}
