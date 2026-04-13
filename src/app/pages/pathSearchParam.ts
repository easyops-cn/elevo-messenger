import { _RoomSearchParams, DirectCreateSearchParams, HomeCreateChatSearchParams } from './paths';

type SearchParamsGetter<T> = (searchParams: URLSearchParams) => T;

export const getRoomSearchParams: SearchParamsGetter<_RoomSearchParams> = (searchParams) => ({
  viaServers: searchParams.get('viaServers') ?? undefined,
});

export const getDirectCreateSearchParams: SearchParamsGetter<DirectCreateSearchParams> = (
  searchParams
) => ({
  userId: searchParams.get('userId') ?? undefined,
});

export const getHomeCreateChatSearchParams: SearchParamsGetter<HomeCreateChatSearchParams> = (
  searchParams
) => ({
  userId: searchParams.get('userId') ?? undefined,
});
