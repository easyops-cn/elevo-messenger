import { atom } from 'jotai';
import { setTauriSettings } from './utils/tauriStore';
import type { ThreadChatState } from './threadChat';

const STORAGE_KEY = 'settings';
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

const setSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  setTauriSettings(settings);
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    set(baseSettings, update);
    setSettings(update);
  }
);
