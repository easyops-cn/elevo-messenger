import React from 'react';

export function UsersIcon(filled?: boolean) {
  // https://lucide.dev/icons/contact
  return (
    <g
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <path d="M16 2v2" />
      <path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" fill={filled ? 'currentColor' : 'none'} />
      <path d="M8 2v2" />
      <circle cx="12" cy="11" r="3" fill={filled ? 'currentColor' : 'none'} />
      <rect x="3" y="4" width="18" height="18" rx="2" />
    </g>
  );
}
