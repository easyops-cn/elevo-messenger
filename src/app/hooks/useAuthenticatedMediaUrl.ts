import { useEffect, useRef, useState } from 'react';
import { useMatrixClient } from './useMatrixClient';
import { NO_SERVICE_WORKER } from '../utils/noServiceWorker';
import { loadCachedMediaUrl } from '../utils/mediaCache';

const MEDIA_PATHS = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail'];

function isAuthenticatedMediaUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return MEDIA_PATHS.some((p) => pathname.startsWith(p));
  } catch {
    return false;
  }
}

/**
 * Hook that converts an authenticated media URL to a blob URL
 * when service worker is disabled. When SW is enabled, returns
 * the URL as-is (SW handles auth injection).
 */
export function useAuthenticatedMediaUrl(url: string | null | undefined): string | undefined {
  const mx = useMatrixClient();
  const [blobUrl, setBlobUrl] = useState<string | undefined>(() => {
    if (!url) return undefined;
    if (!NO_SERVICE_WORKER) return url;
    return undefined;
  });
  const prevBlobRef = useRef<string>();

  useEffect(() => {
    if (!url) {
      setBlobUrl(undefined);
      return undefined;
    }

    if (!NO_SERVICE_WORKER) {
      setBlobUrl(url);
      return undefined;
    }

    if (!isAuthenticatedMediaUrl(url)) {
      setBlobUrl(url);
      return undefined;
    }

    const accessToken = mx.getAccessToken();
    if (!accessToken) {
      setBlobUrl(url);
      return undefined;
    }

    let cancelled = false;

    loadCachedMediaUrl({
      mediaUrl: url,
      mimeType: 'application/octet-stream',
      cacheVariant: 'authenticated-media',
    })
      .then((newUrl) => {
        if (!cancelled) {
          setBlobUrl((prev) => {
            if (prev && prev.startsWith('blob:')) {
              URL.revokeObjectURL(prev);
            }
            return newUrl;
          });
          prevBlobRef.current = newUrl;
        }
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(url);
      });

    return () => {
      cancelled = true;
    };
  }, [url, mx]);

  useEffect(
    () => () => {
      if (prevBlobRef.current) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
    },
    [],
  );

  return blobUrl;
}
