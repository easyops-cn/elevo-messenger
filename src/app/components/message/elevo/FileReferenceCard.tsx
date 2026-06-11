import React from 'react';
import { Box, Icon, Icons, Text, toRem } from 'folds';
import * as css from './FileReferenceCard.css';

export type FileReference = {
  path: string;
  workspaceId?: string;
  workspaceName?: string;
};

export function parseFileReference(content: Record<string, unknown>): FileReference | undefined {
  const raw = content['vip.elevo.file_reference'];
  if (typeof raw !== 'object' || raw === null) return undefined;

  const { path } = raw as Record<string, unknown>;
  if (typeof path !== 'string' || path.trim() === '') return undefined;

  const { workspaceId, workspaceName } = raw as Record<string, unknown>;
  return {
    path,
    workspaceId: typeof workspaceId === 'string' ? workspaceId : undefined,
    workspaceName: typeof workspaceName === 'string' ? workspaceName : undefined,
  };
}

function getBasename(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

type FileReferenceCardProps = {
  fileReference: FileReference;
};

export function FileReferenceCard({ fileReference }: FileReferenceCardProps) {
  const basename = getBasename(fileReference.path);

  return (
    <Box
      className={css.FileReferenceCard}
      shrink="No"
      alignItems="Center"
      title={fileReference.path}
    >
      <Icon style={{ width: toRem(12), height: toRem(12) }} size="50" src={Icons.File} />
      <Text size="T200" truncate>
        {basename}
      </Text>
    </Box>
  );
}
