import React from 'react';
import * as css from './CompactPath.css';

type CompactPathProps = {
  path: string;
  className?: string;
};

export function CompactPath({ path, className }: CompactPathProps) {
  const segments = path.split('/').filter((segment) => segment.length > 0);

  if (segments.length < 3) {
    return (
      <span className={className} title={path}>
        <span className={css.CompactPathWhole}>{path}</span>
      </span>
    );
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const middle = segments.slice(1, -1).join('/');

  return (
    <span className={className} title={path}>
      <span className={css.CompactPath}>
        <span>{first}/</span>
        <span className={css.CompactPathMiddle}>{middle}</span>
        <span>/{last}</span>
      </span>
    </span>
  );
}
