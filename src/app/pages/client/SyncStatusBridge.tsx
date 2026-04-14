import { MatrixClient, SyncState } from 'matrix-js-sdk';
import React, { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { useSyncState } from '../../hooks/useSyncState';
import { syncStateAtom, type SyncStatusInfo } from '../../state/syncState';

type SyncStatusBridgeProps = {
  mx: MatrixClient;
};

export function SyncStatusBridge({ mx }: SyncStatusBridgeProps) {
  const setSyncState = useSetAtom(syncStateAtom);

  useSyncState(
    mx,
    useCallback((current: SyncState, previous: SyncState | undefined) => {
      setSyncState((prev: SyncStatusInfo) => {
        if (prev.state === current && prev.previous === previous) {
          return prev;
        }
        return { state: current, previous };
      });
    }, [setSyncState])
  );

  return null;
}
