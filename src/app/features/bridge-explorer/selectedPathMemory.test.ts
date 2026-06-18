import { describe, expect, it, vi } from 'vitest';

import {
  createSelection,
  getRememberedSelectedPath,
  getRememberedSelection,
  rememberSelectedPath,
  rememberSelection,
} from './selectedPathMemory';

function createStorage() {
  const items = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      items.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      items.delete(key);
    }),
  };
}

describe('bridge explorer selected path memory', () => {
  it('prefers the remembered selected path over the injected initial path', () => {
    const storage = createStorage();
    storage.setItem('elevo.bridgeExplorer.selectedPath:workspace-a', 'src/new.ts');

    expect(getRememberedSelectedPath('workspace-a', 'src/initial.ts', storage)).toBe('src/new.ts');
  });

  it('falls back to the injected initial path when no selected path is remembered', () => {
    expect(getRememberedSelectedPath('workspace-a', 'src/initial.ts', createStorage())).toBe(
      'src/initial.ts',
    );
  });

  it('stores and clears the selected path for a workspace', () => {
    const storage = createStorage();

    rememberSelectedPath('workspace-a', 'src/current.ts', storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      'elevo.bridgeExplorer.selectedPath:workspace-a',
      'src/current.ts',
    );

    rememberSelectedPath('workspace-a', null, storage);
    expect(storage.removeItem).toHaveBeenCalledWith(
      'elevo.bridgeExplorer.selectedPath:workspace-a',
    );
  });

  it('stores and restores directory selection kind', () => {
    const storage = createStorage();

    rememberSelection('workspace-a', { path: 'src/app', kind: 'directory' }, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      'elevo.bridgeExplorer.selectedPathKind:workspace-a',
      'directory',
    );
    expect(getRememberedSelection('workspace-a', null, storage)).toEqual({
      path: 'src/app',
      kind: 'directory',
    });
  });

  it('uses the injected selection kind when the initial path wins', () => {
    expect(
      getRememberedSelection(
        'workspace-a',
        createSelection('src/app', 'directory'),
        createStorage(),
      ),
    ).toEqual({
      path: 'src/app',
      kind: 'directory',
    });
  });
});
