import FileSaver from 'file-saver';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { mimeTypeToExt } from './mimeTypes';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function getExt(fileName: string, mimeType: string): string | undefined {
  const idx = fileName.lastIndexOf('.');
  const ext = idx >= 0 ? fileName.slice(idx + 1) : '';
  if (ext) return ext;

  if (!mimeType || mimeType === 'application/octet-stream') return undefined;
  return mimeTypeToExt(mimeType.split(';')[0]);
}

function getDefaultPath(fileName: string, ext?: string): string {
  if (!ext || fileName.endsWith(`.${ext}`)) return fileName;
  return `${fileName}.${ext}`;
}

export async function saveFile(blob: Blob, fileName: string): Promise<void> {
  if (!isTauri) {
    FileSaver.saveAs(blob, fileName);
    return;
  }

  const ext = getExt(fileName, blob.type);
  const filePath = await save({
    defaultPath: getDefaultPath(fileName, ext),
    filters: ext ? [{ name: 'File', extensions: [ext] }] : undefined,
  });

  if (filePath === null) return;

  const buffer = await blob.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));
}
