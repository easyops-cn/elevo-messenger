import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { OverlayContainerProvider, PopOutContainerProvider, TooltipContainerProvider } from 'folds';
import { RouterProvider } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfigProvider } from '../hooks/useClientConfig';
import { ConfigConfigError, ConfigConfigLoading } from './ConfigConfig';
import { FeatureCheck } from './FeatureCheck';
import { createRouter } from './Router';
import { ScreenSizeProvider, useScreenSize } from '../hooks/useScreenSize';
import { useCompositionEndTracking } from '../hooks/useComposingCheck';
import { createIDBPersister } from '../queryPersister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (persist for offline)
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        // Don't retry when offline
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const persister = createIDBPersister();

function App() {
  const screenSize = useScreenSize();
  useCompositionEndTracking();

  // useSdkMessageListener('test-channel', (payload) => {
  //   console.log('Received SDK message:', payload.channel, payload.data);
  // });

  const portalContainer = document.getElementById('portalContainer') ?? undefined;

  return (
    <TooltipContainerProvider value={portalContainer}>
      <PopOutContainerProvider value={portalContainer}>
        <OverlayContainerProvider value={portalContainer}>
          <ScreenSizeProvider value={screenSize}>
            <FeatureCheck>
              <ClientConfigLoader
                fallback={() => <ConfigConfigLoading />}
                error={(err, retry, ignore) => (
                  <ConfigConfigError error={err} retry={retry} ignore={ignore} />
                )}
              >
                {(clientConfig) => (
                  <ClientConfigProvider value={clientConfig}>
                    <PersistQueryClientProvider
                      client={queryClient}
                      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
                    >
                      <JotaiProvider>
                        <RouterProvider router={createRouter(clientConfig, screenSize)} />
                      </JotaiProvider>
                      <ReactQueryDevtools initialIsOpen={false} />
                    </PersistQueryClientProvider>
                  </ClientConfigProvider>
                )}
              </ClientConfigLoader>
            </FeatureCheck>
          </ScreenSizeProvider>
        </OverlayContainerProvider>
      </PopOutContainerProvider>
    </TooltipContainerProvider>
  );
}

export default App;
