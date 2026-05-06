import React, { ReactNode, createContext, useCallback, useContext, useMemo, useRef } from 'react';

export type ScrollToBottomRequest = {
  force: boolean;
};

type ScrollToBottomListener = (request: ScrollToBottomRequest) => void;

type RoomScrollToBottomContextValue = {
  emitScrollToBottomRequest: (request?: Partial<ScrollToBottomRequest>) => void;
  listenScrollToBottomRequest: (listener: ScrollToBottomListener) => () => void;
};

const NOOP = () => undefined;

const RoomScrollToBottomContext = createContext<RoomScrollToBottomContextValue>({
  emitScrollToBottomRequest: NOOP,
  listenScrollToBottomRequest: () => NOOP,
});

export function RoomScrollToBottomProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Set<ScrollToBottomListener>>(new Set());

  const emitScrollToBottomRequest = useCallback(
    (request?: Partial<ScrollToBottomRequest>) => {
      const payload: ScrollToBottomRequest = {
        force: request?.force ?? false,
      };
      listenersRef.current.forEach((listener) => listener(payload));
    },
    []
  );

  const listenScrollToBottomRequest = useCallback((listener: ScrollToBottomListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      emitScrollToBottomRequest,
      listenScrollToBottomRequest,
    }),
    [emitScrollToBottomRequest, listenScrollToBottomRequest]
  );

  return (
    <RoomScrollToBottomContext.Provider value={value}>{children}</RoomScrollToBottomContext.Provider>
  );
}

export const useRoomScrollToBottom = () => useContext(RoomScrollToBottomContext);