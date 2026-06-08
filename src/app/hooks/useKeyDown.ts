import { useEffect } from 'react';

export const useKeyDown = (
  target: Window,
  callback: (evt: KeyboardEvent) => void,
  options?: boolean | AddEventListenerOptions,
) => {
  useEffect(() => {
    target.addEventListener('keydown', callback, options);
    return () => {
      target.removeEventListener('keydown', callback, options);
    };
  }, [target, callback, options]);
};
