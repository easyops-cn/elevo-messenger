import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Icon, Icons, Spinner, Text } from 'folds';
import { FolderOpenIcon } from '../../icons/FolderOpenIcon';
import { FileIcon } from '../../icons/FileIcon';
import { fetchDirectoryListing } from './api';
import { useBridgeExplorer } from './BridgeExplorerContext';
import { InlineError, useErrorMessage } from './InlineError';
import type { DirectoryEntry } from './types';
import * as css from './BridgeExplorer.css';

type FileTreeProps = {
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
};

/** Join a parent directory path with a child name into a normalized rel path. */
function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

export function getAncestorPaths(path: string | null): Set<string> {
  if (!path) return new Set();

  const parts = path.split('/').filter(Boolean);
  const ancestors = new Set<string>();

  for (let i = 1; i < parts.length; i += 1) {
    ancestors.add(parts.slice(0, i).join('/'));
  }

  return ancestors;
}

export function FileTree({ selectedPath, onSelectFile }: FileTreeProps) {
  const selectedAncestorPaths = getAncestorPaths(selectedPath);

  return (
    <Box className={css.TreeList} direction="Column">
      <DirectoryNode
        path=""
        depth={0}
        selectedPath={selectedPath}
        selectedAncestorPaths={selectedAncestorPaths}
        onSelectFile={onSelectFile}
      />
    </Box>
  );
}

type DirectoryNodeProps = {
  path: string;
  depth: number;
  selectedPath: string | null;
  selectedAncestorPaths: Set<string>;
  onSelectFile: (path: string) => void;
};

function DirectoryNode({
  path,
  depth,
  selectedPath,
  selectedAncestorPaths,
  onSelectFile,
}: DirectoryNodeProps) {
  const { baseUrl, workspaceId } = useBridgeExplorer();
  const toMessage = useErrorMessage();
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestIdRef = useRef(0);

  // Keep error mapping out of `load`'s dependencies: `t` (and thus toMessage)
  // changes once after i18n finishes loading, which would otherwise re-fire the
  // effect and trigger a duplicate request. We store the raw error and map it
  // at render time instead.
  const load = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    fetchDirectoryListing(baseUrl, workspaceId, path)
      .then((nextEntries) => {
        if (requestIdRef.current === requestId) setEntries(nextEntries);
      })
      .catch((e) => {
        if (requestIdRef.current === requestId) setError(e);
      })
      .finally(() => {
        if (requestIdRef.current === requestId) setLoading(false);
      });
  }, [baseUrl, workspaceId, path]);

  // A DirectoryNode is only rendered once its folder is expanded (the root is
  // always rendered), so always load on mount regardless of depth.
  useEffect(() => {
    load();
  }, [load]);

  if (loading && !entries) {
    return (
      <Box style={{ paddingInline: '0.5rem', paddingBlock: '0.25rem' }} alignItems="Center">
        <Spinner size="100" variant="Secondary" />
      </Box>
    );
  }

  if (error) {
    return <InlineError message={toMessage(error)} onRetry={load} />;
  }

  if (!entries) return null;

  return (
    <>
      {entries.map((entry) =>
        entry.type === 'dir' ? (
          <FolderRow
            key={entry.name}
            entry={entry}
            parentPath={path}
            depth={depth}
            selectedPath={selectedPath}
            selectedAncestorPaths={selectedAncestorPaths}
            onSelectFile={onSelectFile}
          />
        ) : (
          <FileRow
            key={entry.name}
            entry={entry}
            parentPath={path}
            depth={depth}
            selected={selectedPath === joinPath(path, entry.name)}
            onSelectFile={onSelectFile}
          />
        ),
      )}
    </>
  );
}

type RowProps = {
  entry: DirectoryEntry;
  parentPath: string;
  depth: number;
  selectedPath: string | null;
  selectedAncestorPaths: Set<string>;
  onSelectFile: (path: string) => void;
};

function FolderRow({
  entry,
  parentPath,
  depth,
  selectedPath,
  selectedAncestorPaths,
  onSelectFile,
}: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const fullPath = joinPath(parentPath, entry.name);
  const shouldRevealSelectedPath = selectedAncestorPaths.has(fullPath);
  const isExpanded = expanded || shouldRevealSelectedPath;
  const indent = { paddingLeft: `${depth * 0.75 + 0.25}rem` };

  return (
    <>
      <button
        type="button"
        className={css.TreeRow}
        style={indent}
        onClick={() => setExpanded((v) => !v)}
      >
        <Icon size="50" src={isExpanded ? Icons.ChevronBottom : Icons.ChevronRight} />
        <Icon size="50" src={FolderOpenIcon} />
        <Text size="T200" truncate>
          {entry.name}
        </Text>
      </button>
      {isExpanded && (
        <DirectoryNode
          path={fullPath}
          depth={depth + 1}
          selectedPath={selectedPath}
          selectedAncestorPaths={selectedAncestorPaths}
          onSelectFile={onSelectFile}
        />
      )}
    </>
  );
}

function FileRow({
  entry,
  parentPath,
  depth,
  selected,
  onSelectFile,
}: Omit<RowProps, 'selectedPath' | 'selectedAncestorPaths'> & { selected: boolean }) {
  const fullPath = joinPath(parentPath, entry.name);
  // Match folder-row indent exactly; alignment with the folder icon is handled
  // by rendering an invisible chevron-sized spacer below.
  const indent = { paddingLeft: `${depth * 0.75 + 0.25}rem` };

  return (
    <button
      type="button"
      className={css.TreeRow}
      style={indent}
      aria-selected={selected}
      onClick={() => onSelectFile(fullPath)}
    >
      {/* Spacer matching the folder chevron so file icons line up with folder icons. */}
      <Icon size="50" src={Icons.ChevronRight} style={{ visibility: 'hidden' }} />
      <Icon size="50" src={FileIcon} />
      <Text size="T200" truncate>
        {entry.name}
      </Text>
    </button>
  );
}
