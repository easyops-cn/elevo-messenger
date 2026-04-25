import { atom } from 'jotai';
import { setTauriSettings } from './utils/tauriStore';

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

  isPeopleDrawer: boolean;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  mediaAutoLoad: boolean;
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

  isPeopleDrawer: false,
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: 0,
  messageSpacing: '400',
  hideMembershipEvents: false,
  hideNickAvatarEvents: true,
  mediaAutoLoad: true,
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

type LegacySettings = Partial<Settings> & {
  themeId?: string;
  useSystemTheme?: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
};

const THEME_IDS = {
  light: new Set<string>(['light-theme', 'silver-theme']),
  dark: new Set<string>(['dark-theme', 'butter-theme']),
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

const getMigratedThemeMode = (legacy: LegacySettings): ThemeMode => {
  if (isThemeMode(legacy.themeMode)) return legacy.themeMode;

  if (legacy.useSystemTheme !== false) {
    return 'system';
  }

  if (THEME_IDS.dark.has(legacy.themeId ?? '')) {
    return 'dark';
  }

  if (THEME_IDS.light.has(legacy.themeId ?? '')) {
    return 'light';
  }

  return 'system';
};

const migrateSettings = (raw: LegacySettings): { settings: Settings; migrated: boolean } => {
  const rest: Partial<Settings> & Record<string, unknown> = { ...raw };
  delete rest.themeId;
  delete rest.useSystemTheme;
  delete rest.lightThemeId;
  delete rest.darkThemeId;

  const themeMode = getMigratedThemeMode(raw);
  const migrated = !isThemeMode(raw.themeMode);

  return {
    settings: {
      ...defaultSettings,
      ...rest,
      themeMode,
    },
    migrated,
  };
};

export const getSettings = () => {
  const settings = localStorage.getItem(STORAGE_KEY);
  if (settings === null) return defaultSettings;

  try {
    const parsed = JSON.parse(settings) as LegacySettings;
    const { settings: migratedSettings, migrated } = migrateSettings(parsed);

    if (migrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSettings));
      setTauriSettings(migratedSettings);
    }

    return migratedSettings;
  } catch {
    return defaultSettings;
  }
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
