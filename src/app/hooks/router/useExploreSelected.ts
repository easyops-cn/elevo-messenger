import { useMatch, useParams } from 'react-router-dom';
import { getExploreFeaturedPath, getExplorePath } from '../../pages/pathUtils';
import { useMatrixClient } from '../useMatrixClient';
import { getCanonicalAliasRoomId, isRoomAlias } from '../../utils/matrix';

export const useExploreSelected = (): boolean => {
  const match = useMatch({
    path: getExplorePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useExploreFeaturedSelected = (): boolean => {
  const match = useMatch({
    path: getExploreFeaturedPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useExploreServer = (): string | undefined => {
  const { server } = useParams();

  return server;
};

export const useExploreSpaceSelected = (): string | undefined => {
  const mx = useMatrixClient();
  const { spaceIdOrAlias } = useParams();

  if (!spaceIdOrAlias) return undefined;

  const spaceId = isRoomAlias(spaceIdOrAlias)
    ? getCanonicalAliasRoomId(mx, spaceIdOrAlias)
    : spaceIdOrAlias;

  return spaceId;
};
