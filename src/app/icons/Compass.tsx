import React from 'react';

export function CompassIcon(filled?: boolean) {
  // https://lucide.dev/icons/compass

  if (filled) {
    return (
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <mask id="compass-filled">
          <circle cx="12" cy="12" r="10" fill="white" stroke="white" />
          <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" fill="black" strokeWidth="0" />
        </mask>
        <circle cx="12" cy="12" r="10" fill="currentColor" mask="url(#compass-filled)" />
      </g>
    );
  }

  return (
    <g
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
    </g>
  );
}