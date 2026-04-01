import { ReactNode, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SpecVersions, specVersions } from '../cs-api';

type SpecVersionsLoaderProps = {
  baseUrl: string;
  fallback?: () => ReactNode;
  error?: (err: unknown, retry: () => void, ignore: () => void) => ReactNode;
  children: (versions: SpecVersions) => ReactNode;
};
export function SpecVersionsLoader({
  baseUrl,
  fallback,
  error,
  children,
}: SpecVersionsLoaderProps) {
  const { data, status, error: queryError, refetch } = useQuery({
    queryKey: ['specVersions', baseUrl],
    queryFn: () => specVersions(fetch, baseUrl),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });
  const [ignoreError, setIgnoreError] = useState(false);

  const ignoreCallback = useCallback(() => setIgnoreError(true), []);

  if (status === 'pending') {
    return fallback?.();
  }

  if (!ignoreError && status === 'error') {
    return error?.(queryError, () => { refetch(); }, ignoreCallback);
  }

  return children(data ?? { versions: [] });
}
