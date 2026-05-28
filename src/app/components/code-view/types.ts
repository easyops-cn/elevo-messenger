import type { DiffFileSummary } from '../message/elevo/diffSummary';

export type CodeViewPayload = {
  title?: string;
  files: DiffFileSummary[];
  added: number;
  deleted: number;
};
