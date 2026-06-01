import React from 'react';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';
import type { CachedMediaRequest } from '../utils/mediaCache';

type MxcImgProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string | undefined;
  cacheScope?: CachedMediaRequest['cacheScope'];
};

/**
 * A drop-in replacement for <img> that handles authenticated Matrix media.
 *
 * When service worker is enabled (default), renders a standard <img>.
 * When service worker is disabled (VITE_NO_SERVICE_WORKER=true),
 * fetches the media with Authorization header and uses a blob URL.
 */
export function MxcImg({ src, cacheScope, ...props }: MxcImgProps) {
  const authSrc = useAuthenticatedMediaUrl(src, { cacheScope });

  return <img {...props} src={authSrc} />;
}
