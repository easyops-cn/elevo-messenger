import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Icon, Icons, Scroll, Spinner, Text, config } from 'folds';
import { Page, PageContent, PageContentCenter, PageHero, PageHeroEmpty, PageHeroSection, PageMain } from '../../../components/page';
import { VirtualTile } from '../../../components/virtualizer';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useTodosApi, type TodoItem } from './useTodosApi';
import { TodoItemCard } from './TodoItemCard';
import { PageSpinner } from '../../../components/PageSpinner';

type TodosPageData = {
  todos: TodoItem[];
  next_cursor: string | null;
  prev_cursor: string | null;
};

export function TodosList() {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  const { status, data, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useTodosApi();

  const allItems = useMemo(() => data?.pages.flatMap((page) => page.todos) ?? [], [data]);

  const handleItemSubmit = useCallback(
    (roomId: string, eventId: string) => {
      queryClient.setQueryData(['todos'], (oldData: { pages: TodosPageData[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            todos: page.todos.filter(
              (item: TodoItem) => !(item.room_id === roomId && item.question_event_id === eventId)
            ),
          })),
        };
      });
    },
    [queryClient]
  );

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 100,
    overscan: 2,
  });

  const vItems = virtualizer.getVirtualItems();

  const lastVItem = vItems[vItems.length - 1];
  const lastVItemIndex = lastVItem?.index;
  const lastItemIndex = allItems.length - 1;

  useEffect(() => {
    if (lastItemIndex > -1 && lastItemIndex === lastVItemIndex && !isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [lastVItemIndex, lastItemIndex, fetchNextPage, isFetchingNextPage, hasNextPage]);

  return (
    <PageMain>
      <Page>
        <Box style={{ position: 'relative' }} grow="Yes">
          <Scroll ref={scrollRef} hideTrack visibility="Hover">
            <PageContent>
              <PageContentCenter>
                <Box direction="Column" gap="200">
                  {!allItems.length && status === 'pending' && (
                    <PageHeroEmpty>
                      <PageHeroSection>
                        <PageHero
                          icon={<Icon size="600" src={Icons.Message} />}
                          title={t('todos.title')}
                          subTitle=""
                        />
                      </PageHeroSection>
                    </PageHeroEmpty>
                  )}

                  {allItems.length === 0 && status === 'success' && (
                    <PageHeroEmpty>
                      <PageHeroSection>
                        <PageHero
                          icon={<Icon size="600" src={Icons.Check} />}
                          title={t('todos.empty')}
                          subTitle={t('todos.emptySubtitle')}
                        />
                      </PageHeroSection>
                    </PageHeroEmpty>
                  )}

                  {status === 'pending' && allItems.length === 0 && (
                    <PageSpinner />
                  )}

                  <Box direction="Column" gap="200">
                    <div
                      style={{
                        position: 'relative',
                        height: virtualizer.getTotalSize(),
                      }}
                    >
                      {vItems.map((vItem) => {
                        const item = allItems[vItem.index];
                        return (
                          <VirtualTile
                            virtualItem={vItem}
                            style={{ paddingBottom: config.space.S500 }}
                            ref={virtualizer.measureElement}
                            key={`${item.room_id}-${item.question_event_id}`}
                          >
                            <TodoItemCard
                              item={item}
                              hour24Clock={hour24Clock}
                              dateFormatString={dateFormatString}
                              onSubmit={handleItemSubmit}
                            />
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
              </PageContentCenter>
            </PageContent>
          </Scroll>
        </Box>
      </Page>
    </PageMain>
  );
}
