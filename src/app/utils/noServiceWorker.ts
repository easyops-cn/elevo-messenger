/**
 * When VITE_NO_SERVICE_WORKER is set to 'true', the app will not register
 * a service worker. This is needed for environments like Tauri custom protocol
 * where service workers are not supported.
 *
 * In no-SW mode, authenticated media requests must be handled manually
 * by fetching with Authorization header and using blob URLs.
 */
export const NO_SERVICE_WORKER = import.meta.env.VITE_NO_SERVICE_WORKER === 'true';
