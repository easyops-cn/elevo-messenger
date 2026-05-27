/* eslint-disable import/first */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import 'folds/dist/style.css';

enableMapSet();

import './index.css';
import './app/i18n';
import { MediaPreviewApp } from './app/features/media-preview/MediaPreviewApp';
import { applyPreviewTheme } from './app/features/media-preview/PreviewTheme';

applyPreviewTheme(window.__ElevoMediaPreview_initialTheme__ ?? 'light');
window.__ElevoMediaPreview_theme__ = applyPreviewTheme;

const rootContainer = document.getElementById('root');

if (rootContainer === null) {
  console.error('Root container element not found!');
} else {
  createRoot(rootContainer).render(<MediaPreviewApp />);
}
