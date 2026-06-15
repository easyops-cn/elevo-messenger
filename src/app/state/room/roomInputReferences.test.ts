import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY,
  EMPTY_ROOM_INPUT_REFERENCES,
  activateFileReference,
  activateTaskReference,
  clearInputReferenceActivity,
  clearInputReferences,
  setFileReference,
  setTaskReference,
  toggleFileReferenceActive,
  toggleTaskReferenceActive,
} from './roomInputReferences';

describe('room input references', () => {
  it('sets a selected file reference without changing per-input activity', () => {
    expect(
      setFileReference(EMPTY_ROOM_INPUT_REFERENCES, {
        path: 'src/app.ts',
        name: 'app.ts',
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace',
      }),
    ).toEqual({
      ...EMPTY_ROOM_INPUT_REFERENCES,
      fileReference: {
        path: 'src/app.ts',
        name: 'app.ts',
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace',
      },
    });
  });

  it('sets a selected task reference without changing per-input activity', () => {
    expect(
      setTaskReference(EMPTY_ROOM_INPUT_REFERENCES, {
        slug: 'fix-login',
        title: 'Fix login',
        status: 'planned',
      }),
    ).toEqual({
      ...EMPTY_ROOM_INPUT_REFERENCES,
      taskReference: {
        slug: 'fix-login',
        title: 'Fix login',
        status: 'planned',
      },
    });
  });

  it('activates and toggles per-input active state separately from references', () => {
    const activity = activateTaskReference(
      activateFileReference(EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY),
    );

    expect(activity).toEqual({
      fileReferenceActive: true,
      taskReferenceActive: true,
    });
    expect(toggleFileReferenceActive(activity)).toEqual({
      ...activity,
      fileReferenceActive: false,
    });
    expect(toggleTaskReferenceActive(activity)).toEqual({
      ...activity,
      taskReferenceActive: false,
    });
  });

  it('clears all references after send or removal', () => {
    const references = setTaskReference(
      setFileReference(EMPTY_ROOM_INPUT_REFERENCES, {
        path: 'src/app.ts',
        name: 'app.ts',
        workspaceId: 'workspace-1',
        workspaceName: 'Workspace',
      }),
      {
        slug: 'fix-login',
        title: 'Fix login',
      },
    );

    expect(references).not.toEqual(EMPTY_ROOM_INPUT_REFERENCES);
    expect(clearInputReferences()).toEqual(EMPTY_ROOM_INPUT_REFERENCES);
    expect(clearInputReferenceActivity()).toEqual(EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY);
  });
});
