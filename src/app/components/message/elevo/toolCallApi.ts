import type { MatrixClient } from 'matrix-js-sdk';
import { Method } from 'matrix-js-sdk';
import { trimLeadingSlash, trimTrailingSlash } from '../../../utils/common';

export type ToolCallDetail = {
  toolCallId: string;
  conversationId?: string;
  name: string;
  title?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  status: 'inprogress' | 'completed' | 'failed';
  state?:
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error';
  metadata?: Record<string, unknown>;
  presentation?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export class ToolCallApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ToolCallApiError';
    this.status = status;
  }
}

export function getToolCallApiUrl(
  homeserverUrl: string,
  bridgeId: string,
  toolCallPath: string,
): string {
  return `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(
    trimTrailingSlash(`${bridgeId}-bridge`),
  )}/tool-call?path=${encodeURIComponent(toolCallPath)}`;
}

export async function fetchToolCallDetail(
  mx: MatrixClient,
  bridgeId: string,
  toolCallPath: string,
): Promise<ToolCallDetail> {
  const path = `/${trimLeadingSlash(trimTrailingSlash(`${bridgeId}-bridge`))}/tool-call`;
  return mx.http.authedRequest<ToolCallDetail>(
    Method.Get,
    path,
    { path: toolCallPath },
    undefined,
    { prefix: '' },
  );
}
