import { atom } from 'jotai';
import { setTauriSettings } from './utils/tauriStore';
import type { ThreadChatState } from './threadChat';

const STORAGE_KEY = 'settings';
const SETTINGS_CHANGE_EVENT = 'elevo-settings-changed';
export type DateFormat =
  | 'LL'
  | 'll'
  | 'D MMM YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | '';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export type ThemeMode = 'system' | 'light' | 'dark';
export enum MessageLayout {
  Modern = 0,
  Compact = 1,
  Bubble = 2,
}

export interface Settings {
  themeMode: ThemeMode;
  monochromeMode?: boolean;
  isMarkdown: boolean;
  editorToolbar: boolean;
  twitterEmoji: boolean;
  pageZoom: number;
  hideActivity: boolean;

  showRoomSidePanel: boolean;
  threadChatStates: Record<string, ThreadChatState>;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  urlPreview: boolean;
  encUrlPreview: boolean;
  showHiddenEvents: boolean;

  showNotifications: boolean;
  isNotificationSounds: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  developerTools: boolean;
  autoUpdateCheck: boolean;

  language?: string;
}

const defaultSettings: Settings = {
  themeMode: 'system',
  monochromeMode: false,
  isMarkdown: true,
  editorToolbar: false,
  twitterEmoji: false,
  pageZoom: 100,
  hideActivity: false,

  showRoomSidePanel: false,
  threadChatStates: {},
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: 0,
  messageSpacing: '400',
  hideMembershipEvents: false,
  hideNickAvatarEvents: true,
  urlPreview: true,
  encUrlPreview: false,
  showHiddenEvents: false,

  showNotifications: true,
  isNotificationSounds: true,

  hour24Clock: false,
  dateFormatString: 'LL',

  developerTools: false,
  autoUpdateCheck: true,
};

export const getSettings = () => {
  const settings = localStorage.getItem(STORAGE_KEY);
  if (settings === null) return defaultSettings;
  return {
    ...defaultSettings,
    ...(JSON.parse(settings) as Settings),
  };
};

const persistSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  setTauriSettings(settings);
};

const broadcastSettings = (settings: Settings) => {
  window.dispatchEvent(
    new CustomEvent<Settings>(SETTINGS_CHANGE_EVENT, {
      detail: settings,
    })
  );
};

export const setSettings = (settings: Settings, broadcast = true) => {
  persistSettings(settings);
  if (broadcast) broadcastSettings(settings);
};

export const subscribeSettings = (handler: (settings: Settings) => void): (() => void) => {
  const handleStorage = (evt: StorageEvent) => {
    if (evt.key !== STORAGE_KEY || evt.newValue === null) return;
    handler({
      ...defaultSettings,
      ...(JSON.parse(evt.newValue) as Settings),
    });
  };

  const handleCustomEvent = (evt: Event) => {
    handler((evt as CustomEvent<Settings>).detail);
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(SETTINGS_CHANGE_EVENT, handleCustomEvent);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(SETTINGS_CHANGE_EVENT, handleCustomEvent);
  };
};

const baseSettings = atom<Settings>(getSettings());
export type SettingsAtomUpdate =
  | Settings
  | {
      settings: Settings;
      broadcast: boolean;
    };

export const settingsAtom = atom<Settings, [SettingsAtomUpdate], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    const nextSettings = 'settings' in update ? update.settings : update;
    const broadcast = 'settings' in update ? update.broadcast : true;
    set(baseSettings, nextSettings);
    setSettings(nextSettings, broadcast);
  }
);
