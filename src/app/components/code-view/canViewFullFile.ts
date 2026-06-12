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
  if (!path || path === UNKNOWN_FILE) return false;
  if (!path.startsWith('/')) return true;
  return ALLOWED_ABSOLUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}
