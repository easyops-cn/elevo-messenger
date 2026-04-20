import { atom } from 'jotai';
import { SettingsPages } from '../features/settings';

export type SettingsModalState = {
  open: boolean;
  initialPage?: SettingsPages;
  requestId: number;
};

export const settingsModalAtom = atom<SettingsModalState>({
  open: false,
  requestId: 0,
});
