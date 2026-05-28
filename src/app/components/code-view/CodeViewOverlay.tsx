import React from 'react';
import FocusTrap from 'focus-trap-react';
import { Modal, Overlay, OverlayBackdrop, OverlayCenter } from 'folds';
import { atom, useAtom } from 'jotai';
import { ModalWide } from '../../styles/Modal.css';
import { stopPropagation } from '../../utils/keyboard';
import { CodeView } from './CodeView';
import type { CodeViewPayload } from './types';

export const codeViewPayloadAtom = atom<CodeViewPayload | undefined>(undefined);

export function CodeViewOverlay() {
  const [payload, setPayload] = useAtom(codeViewPayloadAtom);
  if (!payload) return null;

  const close = () => setPayload(undefined);

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            fallbackFocus: '[data-code-view-overlay]',
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal
            data-code-view-overlay
            tabIndex={-1}
            className={ModalWide}
            size="500"
            onContextMenu={(evt: React.MouseEvent) => evt.stopPropagation()}
          >
            <CodeView payload={payload} requestClose={close} />
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
