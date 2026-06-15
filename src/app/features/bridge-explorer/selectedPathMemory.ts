type SelectedPathStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const selectedPathStorageKey = (workspaceId: string): string =>
  `elevo.bridgeExplorer.selectedPath:${workspaceId}`;

function getSessionStorage(): SelectedPathStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
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
