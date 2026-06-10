// API client for the matrix-llm-bot workspaces proxy.
//
// All requests go to `${homeserverUrl}/${bridgeProvider}/workspaces/*` with the
// user's Matrix access token as a Bearer token. The bot validates the token via
// the homeserver `whoami` endpoint and forwards to the coding-agent manager.
//
// `bridgeProvider` is taken verbatim from room state and already includes the
// `-bridge` segment, so we never append it here.

import { trimLeadingSlash, trimTrailingSlash } from '../../utils/common';
import type { DirectoryEntry, FileContentResult, FileMetadata, WorkspaceInfo } from './types';

/** A typed error carrying the HTTP status for inline error rendering. */
export class BridgeApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BridgeApiError';
    this.status = status;
  }
}

/** Build the workspaces base URL: `${homeserverUrl}/${bridgeProvider}/workspaces`. */
export function getBridgeBaseUrl(homeserverUrl: string, bridgeProvider: string): string {
  return `${trimTrailingSlash(homeserverUrl)}/${trimLeadingSlash(
    trimTrailingSlash(bridgeProvider),
  )}/workspaces`;
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data && typeof data === 'object' && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // ignore JSON parse errors and fall back to status text
  }
  return res.statusText || `HTTP ${res.status}`;
}

async function authedFetch(url: string, token: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    throw new BridgeApiError(e instanceof Error ? e.message : 'Network error', 0);
  }
  if (!res.ok) {
    throw new BridgeApiError(await extractErrorMessage(res), res.status);
  }
  return res;
}

const fileApiBase = (baseUrl: string, workspaceId: string): string =>
  `${baseUrl}/${encodeURIComponent(workspaceId)}/files`;

/** GET `${baseUrl}/${workspaceId}` — basic workspace info. */
export async function fetchWorkspaceInfo(
  baseUrl: string,
  workspaceId: string,
  token: string,
): Promise<WorkspaceInfo> {
  const res = await authedFetch(`${baseUrl}/${encodeURIComponent(workspaceId)}`, token);
  return res.json();
}

/** GET `.../files/list?path=` — directory listing. */
export async function fetchDirectoryListing(
  baseUrl: string,
  workspaceId: string,
  path: string,
  token: string,
): Promise<DirectoryEntry[]> {
  const url = `${fileApiBase(baseUrl, workspaceId)}/list?path=${encodeURIComponent(path)}`;
  const res = await authedFetch(url, token);
  const data = (await res.json()) as { path: string; entries: DirectoryEntry[] };
  return data.entries ?? [];
}

/** GET `.../files/metadata?path=` — file or directory metadata. */
export async function fetchFileMetadata(
  baseUrl: string,
  workspaceId: string,
  path: string,
  token: string,
): Promise<FileMetadata> {
  const url = `${fileApiBase(baseUrl, workspaceId)}/metadata?path=${encodeURIComponent(path)}`;
  const res = await authedFetch(url, token);
  return res.json();
}

/**
 * GET `.../files/content?path=` — file content.
 * Returns text for text files and a blob (with object URL) for media.
 */
export async function fetchFileContent(
  baseUrl: string,
  workspaceId: string,
  path: string,
  token: string,
): Promise<FileContentResult> {
  const url = `${fileApiBase(baseUrl, workspaceId)}/content?path=${encodeURIComponent(path)}`;
  const res = await authedFetch(url, token);
  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream';
  if (contentType.startsWith('text/') || /\b(json|xml|javascript|ecmascript)\b/.test(contentType)) {
    return { kind: 'text', text: await res.text(), contentType };
  }
  const blob = await res.blob();
  return { kind: 'media', blob, url: URL.createObjectURL(blob), contentType };
}

/** Build a download URL for `<a download>` links (token passed via header is not
 * possible for plain anchors, so callers fetch + save instead). */
export function getDownloadUrl(baseUrl: string, workspaceId: string, path: string): string {
  return `${fileApiBase(baseUrl, workspaceId)}/download?path=${encodeURIComponent(path)}`;
}

/** Fetch a file as a blob for download (authenticated). */
export async function fetchFileDownload(
  baseUrl: string,
  workspaceId: string,
  path: string,
  token: string,
): Promise<Blob> {
  const res = await authedFetch(getDownloadUrl(baseUrl, workspaceId, path), token);
  return res.blob();
}
