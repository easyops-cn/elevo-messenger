import { PrimitiveAtom, atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

export type SelectedFileReference = {
  path: string;
  name: string;
  workspaceId: string;
  workspaceName: string;
};

export type SelectedTaskReference = {
  slug: string;
  title: string;
  status?: string;
};

export type RoomInputReferences = {
  fileReference: SelectedFileReference | null;
  taskReference: SelectedTaskReference | null;
};

export const EMPTY_ROOM_INPUT_REFERENCES: RoomInputReferences = {
  fileReference: null,
  taskReference: null,
};

export type RoomInputReferenceActivity = {
  fileReferenceActive: boolean;
  taskReferenceActive: boolean;
};

export const EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY: RoomInputReferenceActivity = {
  fileReferenceActive: false,
  taskReferenceActive: false,
};

const createRoomInputReferencesAtom = () =>
  atom<RoomInputReferences>({ ...EMPTY_ROOM_INPUT_REFERENCES });

export const roomIdToInputReferencesAtomFamily = atomFamily<
  string,
  PrimitiveAtom<RoomInputReferences>
>(() => createRoomInputReferencesAtom());

const createRoomInputReferenceActivityAtom = () =>
  atom<RoomInputReferenceActivity>({ ...EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY });

export const threadOrRoomIdToInputReferenceActivityAtomFamily = atomFamily<
  string,
  PrimitiveAtom<RoomInputReferenceActivity>
>(() => createRoomInputReferenceActivityAtom());

export const setFileReference = (
  references: RoomInputReferences,
  fileReference: SelectedFileReference | null,
): RoomInputReferences => ({
  ...references,
  fileReference,
});

export const setTaskReference = (
  references: RoomInputReferences,
  taskReference: SelectedTaskReference | null,
): RoomInputReferences => ({
  ...references,
  taskReference,
});

export const activateFileReference = (
  activity: RoomInputReferenceActivity,
): RoomInputReferenceActivity => ({
  ...activity,
  fileReferenceActive: true,
});

export const activateTaskReference = (
  activity: RoomInputReferenceActivity,
): RoomInputReferenceActivity => ({
  ...activity,
  taskReferenceActive: true,
});

export const toggleFileReferenceActive = (
  activity: RoomInputReferenceActivity,
): RoomInputReferenceActivity => ({
  ...activity,
  fileReferenceActive: !activity.fileReferenceActive,
});

export const toggleTaskReferenceActive = (
  activity: RoomInputReferenceActivity,
): RoomInputReferenceActivity => ({
  ...activity,
  taskReferenceActive: !activity.taskReferenceActive,
});

export const clearInputReferences = (): RoomInputReferences => ({
  ...EMPTY_ROOM_INPUT_REFERENCES,
});

export const clearInputReferenceActivity = (): RoomInputReferenceActivity => ({
  ...EMPTY_ROOM_INPUT_REFERENCE_ACTIVITY,
});
