import dayjs from 'dayjs';
import { useCallback, ClipboardEventHandler } from 'react';
import { getDataTransferFiles, renameFile } from '../utils/dom';

const getClipboardImageName = (): string => `image-${dayjs().format('YYMMDD-HHmmss')}.png`;

const renameDefaultClipboardImage = (file: File): File => {
  if (file.name !== 'image.png' || file.type !== 'image/png') return file;
  return renameFile(file, getClipboardImageName());
};

export const useFilePasteHandler = (onPaste: (file: File[]) => void): ClipboardEventHandler =>
  useCallback(
    (evt) => {
      const files = getDataTransferFiles(evt.clipboardData)?.map(renameDefaultClipboardImage);
      if (files) onPaste(files);
    },
    [onPaste]
  );
