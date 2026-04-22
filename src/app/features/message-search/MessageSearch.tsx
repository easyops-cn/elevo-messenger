import React, { RefObject, useEffect, useMemo, useRef } from 'react';
import { Text, Box, Icon, Icons, config, Spinner, IconButton, Line, toRem } from 'folds';
import { useTranslation } from 'react-i18next';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SearchOrderBy } from 'matrix-js-sdk';
import { PageHero, PageHeroEmpty, PageHeroSection } from '../../components/page';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { SequenceCard } from '../../components/sequence-card';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { ScrollTopContainer } from '../../components/scroll-top-container';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { decodeSearchParamValueArray, encodeSearchParamValueArray } from '../../pages/pathUtils';
import { MessageSearchParams, useMessageSearch } from './useMessageSearch';
import { SearchResultGroup } from './SearchResultGroup';
import { SearchInput } from './SearchInput';
import { SearchFilters } from './SearchFilters';
import { VirtualTile } from '../../components/virtualizer';
import { useAllHomeRooms } from '../../pages/client/home/useAllHomeRooms';
import { RoomProvider } from '../../hooks/useRoom';

type MessageSearchProps = {
  scrollRef: RefObject<HTMLDivElement>;
};
export function MessageSearch({
  scrollRef,
}: MessageSearchProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const allRooms = useAllHomeRooms();
  const [mediaAutoLoad] = useSetting(settingsAtom, 'mediaAutoLoad');
  const [urlPreview] = useSetting(settingsAtom, 'urlPreview');

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollTopAnchorRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { navigateRoom } = useRoomNavigate();

  const term = searchParams.get('term') ?? undefined;
  const order = searchParams.get('order') ?? undefined;
  const roomsParam = searchParams.get('rooms') ?? undefined;
  const sendersParam = searchParams.get('senders') ?? undefined;

  const searchParamRooms = useMemo(() => {
    if (roomsParam) {
      return decodeSearchParamValueArray(roomsParam).filter(
        (rId) => allRooms.includes(rId)
      );
    }
    return undefined;
  }, [allRooms, roomsParam]);
  const searchParamsSenders = useMemo(() => {
    if (sendersParam) {
      return decodeSearchParamValueArray(sendersParam);
    }
    return undefined;
  }, [sendersParam]);

  const msgSearchParams: MessageSearchParams = useMemo(() => ({
    term,
    order: order ?? SearchOrderBy.Recent,
    rooms: searchParamRooms,
    senders: searchParamsSenders,
  }), [term, order, searchParamRooms, searchParamsSenders]);

  const searchMessages = useMessageSearch(msgSearchParams);

  const { status, data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    enabled: !!msgSearchParams.term,
    queryKey: [
      'search',
      msgSearchParams.term,
      msgSearchParams.order,
      msgSearchParams.rooms,
      msgSearchParams.senders,
    ],
    queryFn: ({ pageParam }) => searchMessages(pageParam),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextToken,
  });

  const groups = useMemo(() => data?.pages.flatMap((result) => result.groups) ?? [], [data]);
  const highlights = useMemo(() => {
    const mixed = data?.pages.flatMap((result) => result.highlights);
    return Array.from(new Set(mixed));
  }, [data]);

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
    overscan: 1,
  });
  const vItems = virtualizer.getVirtualItems();

  const handleSearch = (newTerm: string) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('term');
      newParams.append('term', newTerm);
      return newParams;
    });
  };
  const handleSearchClear = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('term');
      return newParams;
    });
  };

  const handleSelectedRoomsChange = (selectedRooms?: string[]) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('rooms');
      if (selectedRooms && selectedRooms.length > 0) {
        newParams.append('rooms', encodeSearchParamValueArray(selectedRooms));
      }
      return newParams;
    });
  };

  const handleOrderChange = (newOrder?: string) => {
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      newParams.delete('order');
      if (newOrder) {
        newParams.append('order', newOrder);
      }
      return newParams;
    });
  };

  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex: number | undefined = lastVItem?.index;
  const lastGroupIndex = groups.length - 1;
  useEffect(() => {
    if (
      lastGroupIndex > -1 &&
      lastGroupIndex === lastVItemIndex &&
      !isFetchingNextPage &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastVItemIndex, lastGroupIndex, fetchNextPage, isFetchingNextPage, hasNextPage]);

  return (
    <Box direction="Column" gap="700">
      <ScrollTopContainer scrollRef={scrollRef} anchorRef={scrollTopAnchorRef}>
        <IconButton
          onClick={() => virtualizer.scrollToOffset(0)}
          variant="SurfaceVariant"
          radii="Pill"
          outlined
          size="300"
          aria-label={t('common.scrollToTop')}
        >
          <Icon src={Icons.ChevronTop} size="300" />
        </IconButton>
      </ScrollTopContainer>
      <Box ref={scrollTopAnchorRef} direction="Column" gap="300">
        <SearchInput
          active={!!msgSearchParams.term}
          loading={status === 'pending'}
          searchInputRef={searchInputRef}
          onSearch={handleSearch}
          onReset={handleSearchClear}
        />
        <SearchFilters
          roomList={allRooms}
          selectedRooms={searchParamRooms}
          onSelectedRoomsChange={handleSelectedRoomsChange}
          order={msgSearchParams.order}
          onOrderChange={handleOrderChange}
        />
      </Box>

      {!msgSearchParams.term && status === 'pending' && (
        <PageHeroEmpty>
          <PageHeroSection>
            <PageHero
              icon={<Icon size="600" src={Icons.Message} />}
              title={t('search.searchMessages')}
              subTitle={t('search.searchMessagesSubtitle')}
            />
          </PageHeroSection>
        </PageHeroEmpty>
      )}

      {msgSearchParams.term && groups.length === 0 && status === 'success' && (
        <Box
          className={ContainerColor({ variant: 'Warning' })}
          style={{ padding: config.space.S300, borderRadius: config.radii.R400 }}
          alignItems="Center"
          gap="200"
        >
          <Icon size="200" src={Icons.Info} />
          <Text>{t('search.noResultsFor', { term: msgSearchParams.term })}</Text>
        </Box>
      )}

      {((msgSearchParams.term && status === 'pending') ||
        (groups.length > 0 && vItems.length === 0)) && (
        <Box direction="Column" gap="100">
          {[...Array(8).keys()].map((key) => (
            <SequenceCard variant="SurfaceVariant" key={key} style={{ minHeight: toRem(80) }} />
          ))}
        </Box>
      )}

      {vItems.length > 0 && (
        <Box direction="Column" gap="300">
          <Box direction="Column" gap="200">
            <Text size="H5">{t('search.resultsFor', { term: msgSearchParams.term })}</Text>
            <Line size="300" variant="Surface" />
          </Box>
          <div
            style={{
              position: 'relative',
              height: virtualizer.getTotalSize(),
            }}
          >
            {vItems.map((vItem) => {
              const group = groups[vItem.index];
              if (!group) return null;
              const groupRoom = mx.getRoom(group.roomId);
              if (!groupRoom) return null;

              return (
                <VirtualTile
                  virtualItem={vItem}
                  style={{ paddingBottom: config.space.S500 }}
                  ref={virtualizer.measureElement}
                  key={vItem.index}
                >
                  <RoomProvider value={groupRoom}>
                    <SearchResultGroup
                      room={groupRoom}
                      highlights={highlights}
                      items={group.items}
                      mediaAutoLoad={mediaAutoLoad}
                      urlPreview={urlPreview}
                      onOpen={navigateRoom}
                      hour24Clock={hour24Clock}
                      dateFormatString={dateFormatString}
                    />
                  </RoomProvider>
                </VirtualTile>
              );
            })}
          </div>
          {isFetchingNextPage && (
            <Box justifyContent="Center" alignItems="Center">
              <Spinner size="600" variant="Secondary" />
            </Box>
          )}
        </Box>
      )}

      {error && (
        <Box
          className={ContainerColor({ variant: 'Critical' })}
          style={{
            padding: config.space.S300,
            borderRadius: config.radii.R400,
          }}
          direction="Column"
          gap="200"
        >
          <Text size="L400">{error.name}</Text>
          <Text size="T300">{error.message}</Text>
        </Box>
      )}
    </Box>
  );
}
