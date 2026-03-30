import React, { ComponentProps } from 'react';
import { AvatarImage as FoldsAvatarImage } from 'folds';
import { useAuthenticatedMediaUrl } from '../hooks/useAuthenticatedMediaUrl';

/**
 * A wrapper around folds AvatarImage that handles authenticated media URLs.
 * Use this instead of AvatarImage from folds when the src might be an
 * authenticated Matrix media URL.
 */
export const MxcAvatarImage = React.forwardRef<
  HTMLImageElement,
  ComponentProps<typeof FoldsAvatarImage>
>(({ src, ...props }, ref) => {
  const authSrc = useAuthenticatedMediaUrl(src);
  return <FoldsAvatarImage {...props} src={authSrc} ref={ref} />;
});
MxcAvatarImage.displayName = 'MxcAvatarImage';
