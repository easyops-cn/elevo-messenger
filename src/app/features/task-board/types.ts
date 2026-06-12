// Shared types for the task board feature.
//
// These mirror the coding-agent manager read-only tasks API (served through the
// matrix-llm-bot workspaces proxy). All fields are taken verbatim from the
// proxy responses, which are produced by a lenient zod schema, so callers must
// treat `status` as a free-form string and tolerate unknown statuses.

/** Payload injected by the Tauri backend before the task board page loads. */
export type TaskBoardPayload = {
  workspaceId: string;
  workspaceName: string;
  /**
   * Bridge provider segment taken verbatim from room state
   * (`vip.elevo.workspaces`). It already contains the `-bridge` suffix, so the
   * client must NOT append `-bridge` itself.
   */
  bridgeProvider: string;
  /** User's Matrix access token, used as a Bearer token against the bot proxy. */
  matrixToken: string;
  /** Matrix homeserver base URL, e.g. https://m.elevo.vip */
  homeserverUrl: string;
  /** Optional task slug to open on launch. */
  initialTaskSlug?: string;
};

/** A single task summary entry from `.tasks/tasks.yaml`. */
export type TaskSummary = {
  slug: string;
  title: string;
  /** Free-form status; the four known values are listed in `TASK_STATUSES`. */
  status: string;
  author: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
};

/** Aggregated task counts: four known statuses default to 0; unknown appended. */
export type TaskStats = {
  total: number;
  byStatus: Record<string, number>;
};

/** Preset document keys returned inline by the task detail endpoint. */
export type PresetDoc = 'requirement' | 'notes' | 'plan' | 'result';

/** Per-preset-doc content. Missing -> null; too large / unreadable -> { error }. */
export type TaskDocContent = string | null | { error: string };

export type TaskDocs = Record<PresetDoc, TaskDocContent>;

/** Task detail: summary metadata plus the four inline preset documents. */
export type TaskDetail = {
  task: TaskSummary;
  docs: TaskDocs;
};

/** Response of `GET .../tasks`. */
export type TaskListResponse = {
  tasks: TaskSummary[];
};

/** The four known statuses, in board column order. */
export const TASK_STATUSES = ['backlog', 'planned', 'in_progress', 'completed'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The preset documents, in display order. */
export const PRESET_DOCS: PresetDoc[] = ['requirement', 'notes', 'plan', 'result'];
