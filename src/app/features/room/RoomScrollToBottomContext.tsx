import React, { ReactNode, createContext, useCallback, useContext, useMemo, useRef } from 'react';

type ScrollToBottomListener = () => void;

type RoomScrollToBottomContextValue = {
  emitScrollToBottomRequest: () => void;
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
    () => {
      listenersRef.current.forEach((listener) => listener());
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