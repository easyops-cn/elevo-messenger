import React from 'react';

export function SquareAsteriskIcon() {
  // https://lucide.dev/icons/square-asterisk
  return (
    <g
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2"/>
        <path d="M12 8v8"/>
        <path d="m8.5 14 7-4"/>
        <path d="m8.5 10 7 4"/>
    </g>
  );
}
