import React from 'react';
import { useAtomValue } from 'jotai';
import { SyncState } from 'matrix-js-sdk';
import { syncStateAtom } from '../../state/syncState';
import * as css from './SyncStatusText.css';

type SyncStatusTextProps = {
  side: 'left' | 'center';
};

export function SyncStatusText({ side }: SyncStatusTextProps) {
  const { state, previous } = useAtomValue(syncStateAtom);

  let text: string | null = null;
  let variant: 'success' | 'warning' | 'critical' | null = null;

  if (
    state === SyncState.Prepared ||
    state === SyncState.Catchup ||
    (state === SyncState.Syncing &&
      previous !== SyncState.Prepared &&
      previous !== SyncState.Syncing)
  ) {
    text = 'Connecting...';
    variant = 'success';
  } else if (state === SyncState.Reconnecting) {
    text = 'Reconnecting...';
    variant = 'warning';
  } else if (state === SyncState.Error) {
    text = 'Connection Lost!';
    variant = 'critical';
  }

  if (!text || !variant) return null;

  return (
    <span
      className={`${css.SyncStatusText} ${css[variant]} ${
        side === 'center' ? css.positionCenter : css.positionLeft
      }`}
    >
      {text}
    </span>
  );
}
