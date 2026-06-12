import { UNKNOWN_FILE } from '../message/elevo/diffSummary';

/**
 * Workspace mount prefixes under which absolute file paths can be resolved by
 * the workspace / bridge explorers. Both singular and plural forms are allowed.
 */
const ALLOWED_ABSOLUTE_PREFIXES = ['/workspaces/', '/workspace/'];

/**
 * Decide whether the "view full file" entry should be offered for a given diff
 * file path.
 *
 * - Unknown files never qualify.
 * - Relative paths (not starting with `/`) always qualify — they are resolved
 *   relative to the workspace root by the explorer.
 * - Absolute paths qualify only when they fall under a workspace mount prefix
 *   (`/workspaces/` or `/workspace/`). Any other absolute path (e.g.
 *   `/etc/passwd`, `/workspaceX/foo`) cannot be resolved by the explorer, so the
 *   entry is hidden.
 */
export function canViewFullFile(path: string): boolean {
  return getViewFullFilePath(path) !== undefined;
}

/**
 * Convert a diff file path into the path accepted by the workspace explorers.
 *
 * Relative paths are already workspace-relative and are returned unchanged.
 * Absolute paths under a known workspace mount drop the mount directory, e.g.
 * `/workspaces/a/b.txt` becomes `a/b.txt`.
 */
export function getViewFullFilePath(path: string): string | undefined {
  if (!path || path === UNKNOWN_FILE) return undefined;
  if (!path.startsWith('/')) return path;
  const prefix = ALLOWED_ABSOLUTE_PREFIXES.find((absolutePrefix) =>
    path.startsWith(absolutePrefix),
  );
  if (!prefix) return undefined;
  return path.slice(prefix.length);
}
