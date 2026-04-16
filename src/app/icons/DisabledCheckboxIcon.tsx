import React from 'react';

export function DisabledCheckboxIcon(filled?: boolean) {
  // https://lucide.dev/icons/square
  // https://lucide.dev/icons/square-check-big
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {filled ? (
        <>
          <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" />
          <path d="m9 11 3 3L22 4" />
        </>
      ) : (
        <rect width="18" height="18" x="3" y="3" rx="2" />
      )}
    </g>
  );
}
