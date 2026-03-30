import { useEffect, useRef, useState } from 'react';
import { useMatrixClient } from './useMatrixClient';
import { NO_SERVICE_WORKER } from '../utils/noServiceWorker';

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
export function useAuthenticatedMediaUrl(
  url: string | null | undefined
): string | undefined {
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

    fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          const newBlobUrl = URL.createObjectURL(blob);
          setBlobUrl((prev) => {
            if (prev && prev.startsWith('blob:')) {
              URL.revokeObjectURL(prev);
            }
            return newBlobUrl;
          });
          prevBlobRef.current = newBlobUrl;
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
    []
  );

  return blobUrl;
}
