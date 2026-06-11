import { useEffect } from 'react';

let _isComposing = false;

export function useCompositionEndTracking(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const omCompositionStart = () => {
      clearTimeout(timer);
      _isComposing = true;
    };
    const omCompositionEnd = () => {
      // On Safari, compositionend is fired before the final keydown event,
      // causing enter key to be treated as submit.
      timer = setTimeout(() => {
        _isComposing = false;
      }, 100);
    };

    window.addEventListener('compositionstart', omCompositionStart, { capture: true });
    window.addEventListener('compositionend', omCompositionEnd, { capture: true });
    return () => {
      window.removeEventListener('compositionstart', omCompositionStart, { capture: true });
      window.removeEventListener('compositionend', omCompositionEnd, { capture: true });
    };
  }, []);
}

export function isComposing(evt: React.KeyboardEvent): boolean {
  return evt.nativeEvent.isComposing || _isComposing;
}

/**
 * IME composition check for plain DOM KeyboardEvent (e.g. capture-phase
 * window listeners) or any event-like object exposing `isComposing`.
 * Mirrors `isComposing` but does not require a React synthetic event.
 */
export function isComposingEvent(evt: { isComposing?: boolean }): boolean {
  return Boolean(evt.isComposing) || _isComposing;
}
