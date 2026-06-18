import React from 'react';
import { Box, Icon, Text } from 'folds';
import classNames from 'classnames';
import * as css from './FileReferenceCard.css';
import { FileIcon } from '../../../icons/FileIcon';
import { FolderOpenIcon } from '../../../icons/FolderOpenIcon';

export type FileReferenceKind = 'file' | 'directory';

export type FileReference = {
  path: string;
  workspaceId?: string;
  workspaceName?: string;
  kind: FileReferenceKind;
};

export function parseFileReference(content: Record<string, unknown>): FileReference | undefined {
  const raw = content['vip.elevo.file_reference'];
  if (typeof raw !== 'object' || raw === null) return undefined;

  const { path } = raw as Record<string, unknown>;
  if (typeof path !== 'string' || path.trim() === '') return undefined;

  const { workspaceId, workspaceName, kind } = raw as Record<string, unknown>;
  return {
    path,
    workspaceId: typeof workspaceId === 'string' ? workspaceId : undefined,
    workspaceName: typeof workspaceName === 'string' ? workspaceName : undefined,
    kind: kind === 'directory' ? 'directory' : 'file',
  };
}

function getBasename(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

type FileReferenceCardProps = {
  fileReference: FileReference;
  onClick?: () => void;
};

export function FileReferenceCard({ fileReference, onClick }: FileReferenceCardProps) {
  const basename = getBasename(fileReference.path);
  const isDirectory = fileReference.kind === 'directory';
  const interactiveProps = onClick
    ? ({
        as: 'button',
        type: 'button',
        onClick,
      } as const)
    : {};

  return (
    <Box
      className={classNames(css.FileReferenceCard, onClick && css.InteractiveFileReferenceCard)}
      shrink="No"
      alignItems="Center"
      title={isDirectory ? `${fileReference.path}/` : fileReference.path}
      {...interactiveProps}
    >
      <Icon size="50" src={isDirectory ? FolderOpenIcon : FileIcon} />
      <Text size="T200" truncate>
        {basename}
      </Text>
    </Box>
  );
}
