import { describe, expect, it } from 'vitest';

import { getAncestorPaths } from './FileTree';

describe('bridge explorer file tree', () => {
  it('returns every ancestor directory for a selected file path', () => {
    expect([...getAncestorPaths('src/app/main.tsx')]).toEqual(['src', 'src/app']);
  });
});
