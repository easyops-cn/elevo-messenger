import type { MatrixClient } from 'matrix-js-sdk';
import { Method } from 'matrix-js-sdk';
import { trimLeadingSlash, trimTrailingSlash } from '../../../utils/common';

export type ReasoningDetail = {
  reasoningId: string;
  conversationId?: string;
  roomId: string;
  threadRootEventId?: string;
  text: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export class ReasoningApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReasoningApiError';
    this.status = status;
  }
}

export function getReasoningApiUrl(
  homeserverUrl: string,
  bridgeId: string,
  reasoningPath: string,
): string {
  return `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(
    trimTrailingSlash(`${bridgeId}-bridge`),
  )}/reasoning?path=${encodeURIComponent(reasoningPath)}`;
}

export async function fetchReasoningDetail(
  mx: MatrixClient,
  bridgeId: string,
  reasoningPath: string,
): Promise<ReasoningDetail> {
  const path = `/${trimLeadingSlash(trimTrailingSlash(`${bridgeId}-bridge`))}/reasoning`;
  const data = await mx.http.authedRequest<ReasoningDetail>(
    Method.Get,
    path,
    { path: reasoningPath },
    undefined,
    { prefix: '' },
  );
  if (typeof data?.text !== 'string') {
    throw new ReasoningApiError('Invalid reasoning response', 0);
  }
  return data;
}
