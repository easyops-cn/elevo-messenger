import { createContext, useContext } from 'react';
import { getBridgeBaseUrl } from './api';
import type { BridgeExplorerPayload } from './types';

export type BridgeExplorerContextValue = {
  workspaceId: string;
  workspaceName: string;
  /** Base URL: `${homeserverUrl}/${bridgeProvider}/workspaces`. */
  baseUrl: string;
  /** Matrix access token used as Bearer credential. */
  token: string;
};

const BridgeExplorerContext = createContext<BridgeExplorerContextValue | null>(null);

export function createContextValue(payload: BridgeExplorerPayload): BridgeExplorerContextValue {
  return {
    workspaceId: payload.workspaceId,
    workspaceName: payload.workspaceName,
    baseUrl: getBridgeBaseUrl(payload.homeserverUrl, payload.bridgeProvider),
    token: payload.matrixToken,
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
