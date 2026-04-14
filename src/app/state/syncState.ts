import { atom } from 'jotai';
import { SyncState } from 'matrix-js-sdk';

export type SyncStatusInfo = {
  state: SyncState | null;
  previous: SyncState | null | undefined;
};

export const syncStateAtom = atom<SyncStatusInfo>({
  state: null,
  previous: undefined,
});
