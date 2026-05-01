import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useAtomValue } from 'jotai';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import { IsDirectRoomProvider, RoomProvider } from '../../../hooks/useRoom';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { JoinBeforeNavigate } from '../../../features/join-before-navigate';
import { useAllHomeRooms } from './useAllHomeRooms';
import { useSearchParamsViaServers } from '../../../hooks/router/useSearchParamsViaServers';
import { mDirectAtom } from '../../../state/mDirectList';
import { joinedRoomsInitializedAtom } from '../../../state/room-list/roomList';
import { PageSpinner } from '../../../components/PageSpinner';
import { PageMain } from '../../../components/page';

export function HomeRouteRoomProvider({ children }: { children: ReactNode }) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const rooms = useAllHomeRooms();

  const { roomIdOrAlias, eventId } = useParams();
  const viaServers = useSearchParamsViaServers();
  const roomId = useSelectedRoom();
  const room = mx.getRoom(roomId);
  const joinedRoomInitialized = useAtomValue(joinedRoomsInitializedAtom);

  if (!joinedRoomInitialized) {
    return (
      <PageMain>
        <PageSpinner />
      </PageMain>
    );
  }

  if (!room || !rooms.includes(room.roomId)) {
    return (
      <JoinBeforeNavigate
        roomIdOrAlias={roomIdOrAlias!}
        eventId={eventId}
        viaServers={viaServers}
      />
    );
  }

  return (
    <RoomProvider key={room.roomId} value={room}>
      <IsDirectRoomProvider value={mDirects.has(room.roomId)}>{children}</IsDirectRoomProvider>
    </RoomProvider>
  );
}
