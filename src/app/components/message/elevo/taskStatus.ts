import { color } from 'folds';

/**
 * Map a free-text task status (as used by the workspace task board:
 * backlog / planned / in_progress / completed, plus any unknown value)
 * to an accent color. Returns undefined for unknown statuses so callers
 * can fall back to a default color.
 */
export function taskRefStatusColor(status?: string): string | undefined {
  switch ((status ?? '').toLowerCase()) {
    case 'completed':
    case 'done':
      return color.Success.Main;
    case 'in_progress':
    case 'in-progress':
      return color.Primary.Main;
    case 'planned':
      return color.Warning.Main;
    case 'backlog':
      return color.SurfaceVariant.ContainerLine;
    default:
      return undefined;
  }
}
