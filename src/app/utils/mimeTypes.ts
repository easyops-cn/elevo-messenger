export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/apng',
  'image/webp',
  'image/avif',
];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

export const AUDIO_MIME_TYPES = [
  'audio/mp4',
  'audio/webm',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/wave',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wav',
  'audio/flac',
  'audio/x-flac',
];

export const APPLICATION_MIME_TYPES = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/gzip',
  'application/x-gzip',
  'application/x-tar',
  'application/x-bzip2',
  'application/json',
  'application/x-sh',
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
];

export const TEXT_MIME_TYPE = [
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/x-c',
  'text/csv',
  'text/tab-separated-values',
  'text/yaml',
  'text/x-java-source,java',
  'text/markdown',
];

export const READABLE_TEXT_MIME_TYPES = [
  'application/json',
  'application/x-sh',
  'application/ecmascript',
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',

  ...TEXT_MIME_TYPE,
];

export const READABLE_EXT_TO_MIME_TYPE: Record<string, string> = {
  go: 'text/go',
  rs: 'text/rust',
  py: 'text/python',
  swift: 'text/swift',
  c: 'text/c',
  cpp: 'text/cpp',
  java: 'text/java',
  kt: 'text/kotlin',
  lua: 'text/lua',
  php: 'text/php',
  ts: 'text/typescript',
  js: 'text/javascript',
  jsx: 'text/jsx',
  tsx: 'text/tsx',
  html: 'text/html',
  xhtml: 'text/xhtml',
  xht: 'text/xhtml',
  css: 'text/css',
  scss: 'text/scss',
  sass: 'text/sass',
  json: 'text/json',
  md: 'text/markdown',
  yaml: 'text/yaml',
  yni: 'text/yni',
  xml: 'text/xml',
  txt: 'text/plain',
  text: 'text/plain',
  conf: 'text/conf',
  cfg: 'text/conf',
  cnf: 'text/conf',
  log: 'text/log',
  me: 'text/me',
  cvs: 'text/cvs',
  tvs: 'text/tvs',
  sql: 'text/sql',
};

export const EXT_TO_MIME_TYPE: Record<string, string> = {
  zip: 'application/zip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  gz: 'application/gzip',
  gzip: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  bz2: 'application/x-bzip2',
  ...READABLE_EXT_TO_MIME_TYPE,
};

export const ALLOWED_BLOB_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...APPLICATION_MIME_TYPES,
  ...TEXT_MIME_TYPE,
];

export const FALLBACK_MIMETYPE = 'application/octet-stream';

export const getBlobSafeMimeType = (mimeType: string) => {
  if (typeof mimeType !== 'string') return FALLBACK_MIMETYPE;
  const [type] = mimeType.split(';');
  if (!ALLOWED_BLOB_MIME_TYPES.includes(type)) {
    return FALLBACK_MIMETYPE;
  }
  // Required for Chromium browsers
  if (type === 'video/quicktime') {
    return 'video/mp4';
  }
  return type;
};

const inferFileMimeType = (file: File): string | undefined => {
  const ext = getFileNameExt(file.name).toLowerCase();
  return EXT_TO_MIME_TYPE[ext];
};

export const safeFile = (f: File) => {
  const inferredType = inferFileMimeType(f);
  const sourceType =
    f.type && f.type !== FALLBACK_MIMETYPE ? f.type : (inferredType ?? FALLBACK_MIMETYPE);
  const safeType = getBlobSafeMimeType(sourceType);
  if (safeType !== f.type) {
    return new File([f], f.name, { type: safeType });
  }
  return f;
};

export const mimeTypeToExt = (mimeType: string): string => {
  const extStart = mimeType.lastIndexOf('/') + 1;
  return mimeType.slice(extStart);
};
export const getFileNameExt = (fileName: string): string => {
  const extStart = fileName.lastIndexOf('.') + 1;
  return fileName.slice(extStart);
};
export const getFileNameWithoutExt = (fileName: string): string => {
  const extStart = fileName.lastIndexOf('.');
  if (extStart === 0 || extStart === -1) return fileName;
  return fileName.slice(0, extStart);
};
