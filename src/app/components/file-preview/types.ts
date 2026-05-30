export type FilePreviewViewerType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'file';

export type FilePreviewDownloadAction = {
  label: string;
  icon?: import('folds').IconSrc;
  onClick: () => Promise<void>;
};

export type FilePreviewDownloadActionKind = 'download' | 'open-folder';

export type FilePreviewItem = {
  viewerType: FilePreviewViewerType;
  name: string;
  mimeType: string;
  size?: number;
  duration?: number;
  waveform?: number[];
  langName?: string;
  loadBlob: () => Promise<Blob>;
  loadFilePath?: () => Promise<string>;
};
