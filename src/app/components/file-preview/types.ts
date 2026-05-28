export type FilePreviewViewerType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'file';

export type FilePreviewItem = {
  viewerType: FilePreviewViewerType;
  name: string;
  mimeType: string;
  size?: number;
  duration?: number;
  waveform?: number[];
  langName?: string;
  loadBlob: () => Promise<Blob>;
};
