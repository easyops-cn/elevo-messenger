// Shared types for the bridge workspace explorer feature.

/** Payload injected by the Tauri backend before the explorer page loads. */
export type BridgeExplorerPayload = {
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
};

export type FileClassification = 'text' | 'media' | 'binary';

export type FileType = 'file' | 'dir';

/** A single entry in a directory listing. */
export type DirectoryEntry = {
  name: string;
  type: FileType;
  size: number;
  mtime: string;
};

/** Metadata for a single file or directory. */
export type FileMetadata = {
  path: string;
  type: FileType;
  size?: number;
  mtime?: string;
  classification?: FileClassification;
  contentType?: string;
  canReadContent?: boolean;
  contentReadError?: string;
};

/** Basic workspace info returned by the proxy. */
export type WorkspaceInfo = {
  id: string;
  name: string;
  exists: boolean;
};

/** Resolved file content: text body or a media blob with its URL. */
export type FileContentResult =
  | { kind: 'text'; text: string; contentType: string }
  | { kind: 'media'; blob: Blob; url: string; contentType: string };
