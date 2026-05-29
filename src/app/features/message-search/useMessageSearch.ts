import {
  ISearchRequestBody,
  ISearchResponse,
  RelationType,
  SearchOrderBy,
  type ISearchResults,
  type MatrixClient,
  type MatrixEvent,
  type SearchResult,
} from 'matrix-js-sdk';
import { useCallback } from 'react';
import { useMatrixClient } from '../../hooks/useMatrixClient';

export type ResultItem = {
  event: MatrixEvent;
};

export type ResultGroup = {
  roomId: string;
  items: ResultItem[];
};

export type CustomSearchResult = {
  nextToken?: string;
  highlights: string[];
  groups: ResultGroup[];
};

const groupSearchResult = (results: SearchResult[]): ResultGroup[] => {
  const groups: ResultGroup[] = [];

  results.forEach((item) => {
    const event = item.context.getEvent();
    const roomId = event.getRoomId();

    if (
      !roomId ||
      event.getType() !== 'm.room.message' ||
      event.isRelation(RelationType.Replace) ||
      event.isState() ||
      !event.sender
    ) {
      return;
    }

    const resultItem: ResultItem = {
      event,
    };

    const lastAddedGroup: ResultGroup | undefined = groups[groups.length - 1];
    if (lastAddedGroup && roomId === lastAddedGroup.roomId) {
      lastAddedGroup.items.push(resultItem);
      return;
    }
    groups.push({
      roomId,
      items: [resultItem],
    });
  });

  return groups;
};

const parseSearchResult = (
  mx: MatrixClient,
  result: ISearchResponse,
  query: ISearchRequestBody,
): CustomSearchResult => {
  // The js-sdk method backPaginateRoomEventsSearch() uses _query internally
  // so we're reusing the concept here since we want to delegate the
  // pagination back to backPaginateRoomEventsSearch() in some cases.
  const searchResults: ISearchResults = {
    // abortSignal,
    _query: query,
    results: [],
    highlights: [],
  };

  const events = mx.processRoomEventsSearch(searchResults, result);

  const searchResult: CustomSearchResult = {
    nextToken: searchResults?.next_batch,
    highlights: searchResults?.highlights ?? [],
    groups: groupSearchResult(events.results),
  };

  return searchResult;
};

export type MessageSearchParams = {
  term?: string;
  order?: string;
  rooms?: string[];
  senders?: string[];
};
export const useMessageSearch = (params: MessageSearchParams) => {
  const mx = useMatrixClient();
  const { term, order, rooms, senders } = params;

  const searchMessages = useCallback(
    async (nextBatch?: string) => {
      if (!term)
        return {
          highlights: [],
          groups: [],
        };
      const limit = 20;

      const requestBody: ISearchRequestBody = {
        search_categories: {
          room_events: {
            event_context: {
              before_limit: 0,
              after_limit: 0,
              include_profile: false,
            },
            filter: {
              limit,
              rooms,
              senders,
            },
            include_state: false,
            order_by: order as SearchOrderBy.Recent,
            search_term: term,
          },
        },
      };

      const r = await mx.search({
        body: requestBody,
        next_batch: nextBatch === '' ? undefined : nextBatch,
      });
      return parseSearchResult(mx, r, requestBody);
    },
    [mx, term, order, rooms, senders],
  );

  return searchMessages;
};
