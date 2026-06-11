import { createContext, useContext } from 'react';
import { getBridgeBaseUrl } from './api';
import { initToken } from './tokenRefresh';
import type { BridgeExplorerPayload } from './types';

export type BridgeExplorerContextValue = {
  workspaceId: string;
  workspaceName: string;
  /** Base URL: `${homeserverUrl}/${bridgeProvider}/workspaces`. */
  baseUrl: string;
};

const BridgeExplorerContext = createContext<BridgeExplorerContextValue | null>(null);

export function createContextValue(payload: BridgeExplorerPayload): BridgeExplorerContextValue {
  // Seed the token cache; subsequent expiry is refreshed transparently via the
  // main window over the SDK bridge.
  initToken(payload.matrixToken);
  return {
    workspaceId: payload.workspaceId,
    workspaceName: payload.workspaceName,
    baseUrl: getBridgeBaseUrl(payload.homeserverUrl, payload.bridgeProvider),
  };
}

export const BridgeExplorerProvider = BridgeExplorerContext.Provider;

export function useBridgeExplorer(): BridgeExplorerContextValue {
  const ctx = useContext(BridgeExplorerContext);
  if (!ctx) {
    throw new Error('useBridgeExplorer must be used within BridgeExplorerProvider');
  }
  return ctx;
}
