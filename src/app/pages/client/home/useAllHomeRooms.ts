import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useSelectedRooms, RoomSelector } from '../../../state/hooks/roomList';
import { isRoom } from '../../../utils/room';

export const useAllHomeRooms = () => {
  const mx = useMatrixClient();
  const selector: RoomSelector = useCallback(
    (roomId: string) => isRoom(mx.getRoom(roomId)),
    [mx]
  );
  return useSelectedRooms(allRoomsAtom, selector);
};
