import React from 'react';

export function UserIcon(filled?: boolean) {
  // https://lucide.dev/icons/user
  return (
    <g
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2z"/><circle cx="12" cy="7" r="4"/>
    </g>
  );
}