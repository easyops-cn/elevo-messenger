import React from 'react';
import classNames from 'classnames';
import { Box, as } from 'folds';
import * as css from './UrlPreview.css';
import { useAuthenticatedMediaUrl } from '../../hooks/useAuthenticatedMediaUrl';

export const UrlPreview = as<'div'>(({ className, ...props }, ref) => (
  <Box shrink="No" className={classNames(css.UrlPreview, className)} {...props} ref={ref} />
));

export const UrlPreviewImg = as<'img'>(({ className, alt, src, ...props }, ref) => {
  const authSrc = useAuthenticatedMediaUrl(src);
  return (
    <img className={classNames(css.UrlPreviewImg, className)} alt={alt} src={authSrc} {...props} ref={ref} />
  );
});

export const UrlPreviewContent = as<'div'>(({ className, ...props }, ref) => (
  <Box
    grow="Yes"
    direction="Column"
    gap="100"
    className={classNames(css.UrlPreviewContent, className)}
    {...props}
    ref={ref}
  />
));

export const UrlPreviewDescription = as<'span'>(({ className, ...props }, ref) => (
  <span className={classNames(css.UrlPreviewDescription, className)} {...props} ref={ref} />
));
