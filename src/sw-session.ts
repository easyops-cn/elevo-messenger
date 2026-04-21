import { NO_SERVICE_WORKER } from "./app/utils/noServiceWorker";

export function pushSessionToSW(baseUrl?: string, accessToken?: string) {
  if (NO_SERVICE_WORKER) return;
  if (!('serviceWorker' in navigator)) return;
  if (!navigator.serviceWorker.controller) return;

  navigator.serviceWorker.controller.postMessage({
    type: 'setSession',
    accessToken,
    baseUrl,
  });
}
