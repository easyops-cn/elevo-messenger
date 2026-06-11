import React, { CSSProperties } from 'react';
import { Box, Icon, Icons, Text } from 'folds';
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
  style?: CSSProperties;
};

export function FileReferenceCard({ fileReference, style }: FileReferenceCardProps) {
  const basename = getBasename(fileReference.path);

  return (
    <Box
      className={css.FileReferenceCard}
      alignItems="Center"
      gap="100"
      title={fileReference.path}
      style={style}
    >
      <Icon size="50" src={Icons.File} />
      <Text size="T300" truncate>
        {basename}
      </Text>
    </Box>
  );
}
