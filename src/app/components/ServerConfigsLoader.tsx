import { ReactNode } from 'react';
import { Capabilities, validateAuthMetadata, ValidatedAuthMetadata } from 'matrix-js-sdk';
import { useQuery } from '@tanstack/react-query';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { MediaConfig } from '../hooks/useMediaConfig';
import { promiseFulfilledResult } from '../utils/common';

export type ServerConfigs = {
  capabilities?: Capabilities;
  mediaConfig?: MediaConfig;
  authMetadata?: ValidatedAuthMetadata;
};

const EMPTY_CONFIGS: ServerConfigs = {};

type ServerConfigsLoaderProps = {
  children: (configs: ServerConfigs) => ReactNode;
};
export function ServerConfigsLoader({ children }: ServerConfigsLoaderProps) {
  const mx = useMatrixClient();

  const { data: configs = EMPTY_CONFIGS } = useQuery({
    queryKey: ['serverConfigs', mx.getHomeserverUrl()],
    queryFn: async (): Promise<ServerConfigs> => {
      const result = await Promise.allSettled([
        mx.getCapabilities(),
        mx.getMediaConfig(),
        mx.getAuthMetadata(),
      ]);

      const capabilities = promiseFulfilledResult(result[0]);
      const mediaConfig = promiseFulfilledResult(result[1]);
      const authMetadata = promiseFulfilledResult(result[2]);
      let validatedAuthMetadata: ValidatedAuthMetadata | undefined;

      try {
        validatedAuthMetadata = validateAuthMetadata(authMetadata);
      } catch (e) {
        console.error(e);
      }

      return {
        capabilities,
        mediaConfig,
        authMetadata: validatedAuthMetadata,
      };
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: Infinity,
  });

  return children(configs);
}
