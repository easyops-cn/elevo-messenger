import React, { VideoHTMLAttributes, forwardRef } from 'react';
import classNames from 'classnames';
import * as css from './media.css';

export const Video = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  function LegacyVideo({ className, ...props }, ref) {
    return <video className={classNames(css.Video, className)} {...props} ref={ref} />;
  },
);
