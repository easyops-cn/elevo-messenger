import { useCallback } from 'react';
import { NavigateOptions, useNavigate } from 'react-router-dom';
import { getCanonicalAliasOrRoomId } from '../utils/matrix';
import {
  getExploreSpacePath,
  getHomeRoomPath,
} from '../pages/pathUtils';
import { useMatrixClient } from './useMatrixClient';

export const useRoomNavigate = () => {
  const navigate = useNavigate();
  const mx = useMatrixClient();

  const navigateSpace = useCallback(
    (roomId: string) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
      navigate(getExploreSpacePath(roomIdOrAlias));
    },
    [mx, navigate]
  );

  const navigateRoom = useCallback(
    (roomId: string, eventId?: string, opts?: NavigateOptions) => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, roomId);
      navigate(getHomeRoomPath(roomIdOrAlias, eventId), opts);
    },
    [mx, navigate]
  );

  return {
    navigateSpace,
    navigateRoom,
  };
};
