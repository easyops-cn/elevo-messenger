import React from 'react';

export function DisabledRadioIcon(filled?: boolean) {
  // https://lucide.dev/icons/circle
  // https://lucide.dev/icons/circle-small
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill="none" />
      {filled && <circle cx="12" cy="12" r="6" fill="currentColor" strokeWidth="0" />}
    </g>
  );
}
