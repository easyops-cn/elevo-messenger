import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { useSetAtom } from 'jotai';
import { isDesktopTauri } from '../plugins/useTauriOpener';
import { codeViewPayloadAtom, type CodeViewPayload } from '../components/code-view';

export const useOpenCodeView = (): ((payload: CodeViewPayload) => Promise<boolean>) => {
  const setCodeViewPayload = useSetAtom(codeViewPayloadAtom);

  return useCallback(
    async (payload: CodeViewPayload): Promise<boolean> => {
      if (isDesktopTauri) {
        try {
          const serializablePayload: CodeViewPayload = payload.bridge
            ? {
                ...payload,
                bridge: {
                  ...payload.bridge,
                  refreshMatrixToken: undefined,
                },
              }
            : payload;
          await invoke('open_code_view_window', { payload: serializablePayload });
          return true;
        } catch (error) {
          console.error('[codeView] open_code_view_window failed:', error);
        }
      }

      setCodeViewPayload(payload);
      return true;
    },
    [setCodeViewPayload],
  );
};
