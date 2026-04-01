import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Reactively tracks browser online/offline status.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

const NetworkStatusContext = createContext<boolean>(true);

export const NetworkStatusProvider = NetworkStatusContext.Provider;

export function useNetworkStatus(): boolean {
  return useContext(NetworkStatusContext);
}
