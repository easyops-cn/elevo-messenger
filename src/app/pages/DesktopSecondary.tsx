import React, { useEffect, useMemo, useState } from 'react';
import { Box, Spinner, Text, varsClass } from 'folds';
import { useSearchParams } from 'react-router-dom';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { lightTheme } from '../../colors.css';
import { elevoConfig, elevoLight } from '../../config.css';
import { ImageViewer } from '../components/image-viewer';
import { decryptFile, downloadEncryptedMedia, downloadMedia } from '../utils/matrix';
import { FALLBACK_MIMETYPE } from '../utils/mimeTypes';
import { getFallbackSession } from '../state/sessions';

function closeCurrentWindow() {
  window.close();
}

function parseEncryptedInfo(value: string | null): EncryptedAttachmentInfo | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as EncryptedAttachmentInfo;
  } catch {
    return undefined;
  }
}

function mxcToDownloadUrl(
  baseUrl: string,
  mxcUrl: string,
  useAuthentication: boolean
): string | undefined {
  const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
  if (!match) return undefined;

  const [, serverName, mediaId] = match;
  const mediaPath = useAuthentication
    ? '/_matrix/client/v1/media/download'
    : '/_matrix/media/v3/download';
  return `${baseUrl}${mediaPath}/${encodeURIComponent(serverName)}/${encodeURIComponent(mediaId)}`;
}

function DesktopImageViewerContent() {
  const [searchParams] = useSearchParams();
  const alt = searchParams.get('alt') || 'Image';
  const url = searchParams.get('url');
  const mimeType = searchParams.get('mimeType') || FALLBACK_MIMETYPE;
  const useAuthentication = searchParams.get('useAuthentication') === 'true';
  const encInfo = useMemo(() => parseEncryptedInfo(searchParams.get('encInfo')), [searchParams]);
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    let objectUrl: string | undefined;

    const load = async () => {
      setError(undefined);
      setSrc(undefined);

      if (!url) {
        setError('Missing image URL.');
        return;
      }

      const session = getFallbackSession();
      if (!session) {
        setError('Sign in to preview this image.');
        return;
      }

      const mediaUrl = mxcToDownloadUrl(session.baseUrl, url, useAuthentication);
      if (!mediaUrl) {
        setError('Invalid image URL.');
        return;
      }

      if (!encInfo) {
        const blob = await downloadMedia(mediaUrl);
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        return;
      }

      const fileContent = await downloadEncryptedMedia(mediaUrl, (encBuf) =>
        decryptFile(encBuf, mimeType, encInfo)
      );
      if (!alive) return;
      objectUrl = URL.createObjectURL(fileContent);
      setSrc(objectUrl);
    };

    load().catch((e) => {
      if (alive) setError(e instanceof Error ? e.message : 'Failed to load image.');
    });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, useAuthentication, encInfo, mimeType]);

  if (error) {
    return (
      <Box grow="Yes" alignItems="Center" justifyContent="Center">
        <Text>{error}</Text>
      </Box>
    );
  }

  if (!src) {
    return (
      <Box grow="Yes" alignItems="Center" justifyContent="Center">
        <Spinner variant="Secondary" />
      </Box>
    );
  }

  return <ImageViewer src={src} alt={alt} requestClose={closeCurrentWindow} />;
}

export function DesktopImageViewerWindow() {
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(elevoConfig, varsClass, lightTheme, elevoLight, 'prism-light');
  }, []);

  return (
    <Box style={{ width: '100vw', height: '100vh' }}>
      <DesktopImageViewerContent />
    </Box>
  );
}
