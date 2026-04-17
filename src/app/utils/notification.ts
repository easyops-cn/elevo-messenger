import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { isDesktopTauri } from '../plugins/useTauriOpener';

export type SystemNotificationHandle = {
  close: () => void;
};

export type SystemNotificationOptions = {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  silent?: boolean;
  onClick?: () => void;
};

let tauriPermissionCache: PermissionState = 'prompt';

const normalizePermission = (permission: string): PermissionState => {
  if (permission === 'default') return 'prompt';
  if (permission === 'granted' || permission === 'denied' || permission === 'prompt') {
    return permission;
  }
  return 'prompt';
};

export const isNotificationSupported = (): boolean =>
  isDesktopTauri || (typeof window !== 'undefined' && 'Notification' in window);

export const getNotificationPermission = async (): Promise<PermissionState> => {
  if (isDesktopTauri) {
    try {
      const granted = await isPermissionGranted();
      if (granted) {
        tauriPermissionCache = 'granted';
        return 'granted';
      }

      return tauriPermissionCache;
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  return normalizePermission(window.Notification.permission);
};

export const requestNotificationPermission = async (): Promise<PermissionState> => {
  if (isDesktopTauri) {
    try {
      const state = normalizePermission(await requestPermission());
      tauriPermissionCache = state;
      return state;
    } catch {
      return 'denied';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  return normalizePermission(await window.Notification.requestPermission());
};

export const sendSystemNotification = async (
  options: SystemNotificationOptions
): Promise<SystemNotificationHandle | undefined> => {
  const permission = await getNotificationPermission();
  if (permission !== 'granted') return undefined;

  if (isDesktopTauri) {
    await sendNotification({
      title: options.title,
      ...(options.body ? { body: options.body } : {}),
      ...(options.icon ? { icon: options.icon } : {}),
    });
    return {
      close: () => {
        // Tauri desktop notification close/cancel requires tracking IDs.
      },
    };
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return undefined;
  }

  const note = new window.Notification(options.title, {
    body: options.body,
    icon: options.icon,
    badge: options.badge,
    silent: options.silent,
  });

  if (options.onClick) {
    note.onclick = () => {
      options.onClick?.();
      note.close();
    };
  }

  return {
    close: () => note.close(),
  };
};
