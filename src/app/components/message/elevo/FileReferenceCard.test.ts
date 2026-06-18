import { describe, expect, it } from 'vitest';

import { parseFileReference } from './FileReferenceCard';

describe('parseFileReference', () => {
  it('defaults historical references to file kind', () => {
    expect(
      parseFileReference({
        'vip.elevo.file_reference': {
          path: 'src/app.ts',
          workspaceId: 'workspace-a',
          workspaceName: 'Workspace A',
        },
      }),
    ).toEqual({
      path: 'src/app.ts',
      workspaceId: 'workspace-a',
      workspaceName: 'Workspace A',
      kind: 'file',
    });
  });

  it('preserves directory references', () => {
    expect(
      parseFileReference({
        'vip.elevo.file_reference': {
          path: 'src/features',
          kind: 'directory',
        },
      }),
    ).toEqual({
      path: 'src/features',
      workspaceId: undefined,
      workspaceName: undefined,
      kind: 'directory',
    });
  });
});
