import type { MatrixClient } from 'matrix-js-sdk';
import { Method } from 'matrix-js-sdk';
import { trimLeadingSlash, trimTrailingSlash } from '../../../utils/common';
import {
  summarizeElevoDiffResponseContent,
  type DiffSummary,
  type ElevoDiffResponseContent,
} from './diffSummary';

export class DiffApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DiffApiError';
    this.status = status;
  }
}

export function getDiffApiUrl(homeserverUrl: string, bridgeId: string, diffPath: string): string {
  return `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(
    trimTrailingSlash(`${bridgeId}-bridge`),
  )}/diff?path=${encodeURIComponent(diffPath)}`;
}

export async function fetchDiffSummary(
  mx: MatrixClient,
  bridgeId: string,
  diffPath: string,
): Promise<DiffSummary> {
  const path = `/${trimLeadingSlash(trimTrailingSlash(`${bridgeId}-bridge`))}/diff`;
  const data = await mx.http.authedRequest<ElevoDiffResponseContent>(
    Method.Get,
    path,
    { path: diffPath },
    undefined,
    { prefix: '' },
  );
  const summary = summarizeElevoDiffResponseContent(data);
  if (!summary) throw new DiffApiError('Invalid diff response', 0);
  return summary;
}
