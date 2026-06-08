import type { DiffFileSummary } from '../message/elevo/diffSummary';

export type CodeViewWorkspaceContext = {
  roomId: string;
  workspaceExplorerUrl: string;
};

export type CodeViewPayload = {
  title?: string;
  files: DiffFileSummary[];
  added: number;
  deleted: number;
} & Partial<CodeViewWorkspaceContext>;
