import type { BridgeExplorerSelection, BridgeExplorerSelectionKind } from './types';

type SelectedPathStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const selectedPathStorageKey = (workspaceId: string): string =>
  `elevo.bridgeExplorer.selectedPath:${workspaceId}`;
const selectedPathKindStorageKey = (workspaceId: string): string =>
  `elevo.bridgeExplorer.selectedPathKind:${workspaceId}`;

function getSessionStorage(): SelectedPathStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function createSelection(
  path: string | null | undefined,
  kind: BridgeExplorerSelectionKind = 'file',
): BridgeExplorerSelection | null {
  if (!path) return null;
  return { path, kind };
}

export function getRememberedSelectedPath(
  workspaceId: string,
  fallbackPath: string | null,
  storage: SelectedPathStorage | null = getSessionStorage(),
): string | null {
  try {
    const rememberedPath = storage?.getItem(selectedPathStorageKey(workspaceId));
    return rememberedPath || fallbackPath;
  } catch {
    return fallbackPath;
  }
}

export function getRememberedSelection(
  workspaceId: string,
  fallbackSelection: BridgeExplorerSelection | null,
  storage: SelectedPathStorage | null = getSessionStorage(),
): BridgeExplorerSelection | null {
  const rememberedPath = getRememberedSelectedPath(
    workspaceId,
    fallbackSelection?.path ?? null,
    storage,
  );
  if (!rememberedPath) return null;
  if (rememberedPath === fallbackSelection?.path && fallbackSelection) return fallbackSelection;

  try {
    const rememberedKind = storage?.getItem(selectedPathKindStorageKey(workspaceId));
    return {
      path: rememberedPath,
      kind: rememberedKind === 'directory' ? 'directory' : 'file',
    };
  } catch {
    return { path: rememberedPath, kind: 'file' };
  }
}

export function rememberSelectedPath(
  workspaceId: string,
  path: string | null,
  storage: SelectedPathStorage | null = getSessionStorage(),
): void {
  try {
    const key = selectedPathStorageKey(workspaceId);
    if (path) {
      storage?.setItem(key, path);
    } else {
      storage?.removeItem(key);
    }
  } catch {
    // Ignore storage failures; bridge explorer can still use the injected payload.
  }
}

export function rememberSelection(
  workspaceId: string,
  selection: BridgeExplorerSelection | null,
  storage: SelectedPathStorage | null = getSessionStorage(),
): void {
  rememberSelectedPath(workspaceId, selection?.path ?? null, storage);

  try {
    const key = selectedPathKindStorageKey(workspaceId);
    if (selection) {
      storage?.setItem(key, selection.kind);
    } else {
      storage?.removeItem(key);
    }
  } catch {
    // Ignore storage failures; bridge explorer can still use the injected payload.
  }
}
