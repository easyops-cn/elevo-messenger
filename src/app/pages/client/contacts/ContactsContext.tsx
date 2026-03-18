import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { EventTimeline, Room, RoomStateEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

export const CONTACTS_ROOM_ID = '!soqAfmrZyVbUygvYFp:m.easyops.local';

type ContactsContextValue = {
  room: Room | null;
  javisRoleMap: Record<string, string>;
  roles: string[];
};

const ContactsContext = createContext<ContactsContextValue>({
  room: null,
  javisRoleMap: {},
  roles: [],
});

export function ContactsProvider({ children }: { children: ReactNode }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(CONTACTS_ROOM_ID);
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    if (!room) return;
    const handler = () => setStateVersion((v) => v + 1);
    room.on(RoomStateEvent.Events, handler);
    return () => {
      room.off(RoomStateEvent.Events, handler);
    };
  }, [room]);

  const javisRoleMap = useMemo<Record<string, string>>(() => {
    if (!room) return {};
    const event = room
      .getLiveTimeline()
      .getState(EventTimeline.FORWARDS)
      ?.getStateEvents('vip.elevo.roles', 'javis');
    return (event?.getContent() as Record<string, string>) ?? {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, stateVersion]);

  const roles = useMemo(
    () => [...new Set(Object.values(javisRoleMap))].sort(),
    [javisRoleMap]
  );

  return (
    <ContactsContext.Provider value={{ room, javisRoleMap, roles }}>
      {children}
    </ContactsContext.Provider>
  );
}

export const useContactsContext = () => useContext(ContactsContext);
