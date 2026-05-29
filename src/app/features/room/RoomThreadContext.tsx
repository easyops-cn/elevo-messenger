import React, { ReactNode, createContext, useContext } from 'react';
import { type Thread } from 'matrix-js-sdk';

const RoomThreadContext = createContext<Thread | undefined>(undefined);

export function RoomThreadProvider({ thread, children }: { thread?: Thread; children: ReactNode }) {
  return <RoomThreadContext.Provider value={thread}>{children}</RoomThreadContext.Provider>;
}

export const useRoomThread = () => useContext(RoomThreadContext);
