import { isDesktopTauri } from '../../plugins/useTauriOpener';

const STORE_FILE = 'settings.json';
const STORE_KEY = 'settings';

type LazyStoreInstance = {
  get: <T>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
};

let storePromise: Promise<LazyStoreInstance | null> | null = null;

function getStore(): Promise<LazyStoreInstance | null> {
  if (!isDesktopTauri) return Promise.resolve(null);

  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store')
      .then(({ LazyStore }) => new LazyStore(STORE_FILE) as LazyStoreInstance)
      .catch(() => null);
  }
  return storePromise;
}

export async function getTauriSettings<T>(): Promise<T | null> {
  const store = await getStore();
  if (!store) return null;
  const value = await store.get<T>(STORE_KEY);
  return value ?? null;
}

export async function setTauriSettings<T>(value: T): Promise<void> {
  const store = await getStore();
  if (!store) return;
  await store.set(STORE_KEY, value);
}
