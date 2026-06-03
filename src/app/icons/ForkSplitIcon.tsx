import React from 'react';

export function ForkSplitIcon() {
  // https://lucide.dev/icons/split
  return (
    <g
      transform="rotate(90 12 12)"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 3h5v5" />
      <path d="M8 3H3v5" />
      <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
      <path d="m15 9 6-6" />
    </g>
  );
}
