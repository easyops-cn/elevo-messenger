import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { Box, Spinner, Text } from 'folds';
import { useSearchParams } from 'react-router-dom';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { AuthRouteThemeManager } from './ThemeManager';
import { ClientBindAtoms, ClientRoot } from './client';
import { ClientInitStorageAtom } from './client/ClientInitStorageAtom';
import { ClientRoomsNotificationPreferences } from './client/ClientRoomsNotificationPreferences';
import { getFallbackSession } from '../state/sessions';
import { Settings, SettingsPages } from '../features/settings';
import { ImageViewer } from '../components/image-viewer';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { useMediaAuthentication } from '../hooks/useMediaAuthentication';
import { decryptFile, downloadEncryptedMedia, mxcUrlToHttp } from '../utils/matrix';
import { FALLBACK_MIMETYPE } from '../utils/mimeTypes';
import { PageRoot } from '../components/page';

function DesktopSecondaryProviders({ children }: { children: ReactNode }) {
  if (!getFallbackSession()) {
    return (
      <AuthRouteThemeManager>
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Text>Sign in to continue.</Text>
        </Box>
      </AuthRouteThemeManager>
    );
  }

  return (
    <AuthRouteThemeManager>
      <ClientRoot>
        <ClientInitStorageAtom>
          <ClientRoomsNotificationPreferences>
            <ClientBindAtoms>{children}</ClientBindAtoms>
          </ClientRoomsNotificationPreferences>
        </ClientInitStorageAtom>
      </ClientRoot>
    </AuthRouteThemeManager>
  );
}

function closeCurrentWindow() {
  window.close();
}

export function DesktopSettingsWindow() {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page'));
  const initialPage = Number.isInteger(page) ? (page as SettingsPages) : undefined;

  return (
    <DesktopSecondaryProviders>
      <Settings initialPage={initialPage} requestClose={closeCurrentWindow} />
    </DesktopSecondaryProviders>
  );
}

function parseEncryptedInfo(value: string | null): EncryptedAttachmentInfo | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as EncryptedAttachmentInfo;
  } catch {
    return undefined;
  }
}

function DesktopImageViewerContent() {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [searchParams] = useSearchParams();
  const alt = searchParams.get('alt') || 'Image';
  const url = searchParams.get('url');
  const mimeType = searchParams.get('mimeType') || FALLBACK_MIMETYPE;
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

      const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
      if (!mediaUrl) {
        setError('Invalid image URL.');
        return;
      }

      if (!encInfo) {
        setSrc(mediaUrl);
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
  }, [mx, url, useAuthentication, encInfo, mimeType]);

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
  return (
    <DesktopSecondaryProviders>
      <PageRoot nav={null} variant="Surface">
        <DesktopImageViewerContent />
      </PageRoot>
    </DesktopSecondaryProviders>
  );
}
