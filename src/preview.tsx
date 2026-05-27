import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, Button, Header, Icon, IconButton, Icons, Spinner, Text, varsClass } from 'folds';
import 'folds/dist/style.css';
import './index.css';
import './preview.css';
import './app/i18n';
import { saveFile } from './app/utils/file-saver';
import { loadMediaBlob, loadMediaBlobUrl } from './app/utils/mediaDownload';
import type { DesktopPreviewPayload } from './app/utils/desktopPreview';
import { bytesToSize, getFileTypeIcon, secondsToMinutesAndSeconds } from './app/utils/common';
import { elevoConfig } from './config.css';
import { DarkTheme, LightTheme, ThemeContextProvider, ThemeKind } from './app/hooks/useTheme';
import { ImageViewer } from './app/components/image-viewer';
import { VideoViewer } from './app/components/video-viewer/VideoViewer';
import { PdfViewer } from './app/components/Pdf-viewer/PdfViewer';
import { TextViewer } from './app/components/text-viewer';
import { WaveformPlayer } from './app/components/media/WaveformPlayer';
import * as css from './previewStyles.css';

declare global {
  interface Window {
    __ElevoPreview_initialTheme__?: ThemeKind;
    __ElevoPreview_initialPayload__?: DesktopPreviewPayload;
    __ElevoPreview_receive__?: (payload: DesktopPreviewPayload) => void;
    __ElevoMessengerSDK_receive__?: (channel: string, data: unknown) => void;
  }
}

const applyTheme = (themeKind: ThemeKind) => {
  document.body.className = '';
  document.body.classList.add(elevoConfig, varsClass, css.PreviewBody);
  document.body.classList.add(
    ...(themeKind === ThemeKind.Dark ? DarkTheme.classNames : LightTheme.classNames)
  );
};

function PreviewTheme({ children }: { children: React.ReactNode }) {
  const [themeKind, setThemeKind] = useState<ThemeKind>(
    window.__ElevoPreview_initialTheme__ === ThemeKind.Dark ? ThemeKind.Dark : ThemeKind.Light
  );
  const theme = themeKind === ThemeKind.Dark ? DarkTheme : LightTheme;

  useEffect(() => {
    applyTheme(themeKind);
  }, [themeKind]);

  useEffect(() => {
    window.__ElevoMessengerSDK_receive__ = (channel, data) => {
      if (channel === 'theme_change' && (data === ThemeKind.Light || data === ThemeKind.Dark)) {
        setThemeKind(data);
      }
    };
  }, []);

  return <ThemeContextProvider value={theme}>{children}</ThemeContextProvider>;
}

function PreviewAudio({ payload }: { payload: DesktopPreviewPayload }) {
  const durationSec = ((payload.duration ?? 0) >= 0 ? payload.duration ?? 0 : 0) / 1000;
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSrc = useCallback(async () => {
    if (src || loading) return;
    setLoading(true);
    try {
      setSrc(await loadMediaBlobUrl(payload.mediaUrl, payload.mimeType, payload.encInfo));
    } finally {
      setLoading(false);
    }
  }, [loading, payload.encInfo, payload.mediaUrl, payload.mimeType, src]);

  if (payload.waveform?.length) {
    return (
      <Box style={{ width: 'min(720px, 90vw)' }}>
        <WaveformPlayer
          audioSrc={src}
          waveform={payload.waveform}
          durationSec={durationSec}
          mimeType={payload.mimeType}
          isLoading={loading}
          onPlayClick={loadSrc}
          autoPlay
        />
      </Box>
    );
  }

  return (
    <Box style={{ width: 'min(720px, 90vw)' }}>
      {!src && (
        <Button
          variant="Primary"
          fill="Solid"
          size="400"
          radii="300"
          onClick={loadSrc}
          disabled={loading}
          before={loading ? <Spinner size="100" /> : <Icon size="200" src={Icons.ArrowRight} />}
        >
          <Text>Play</Text>
        </Button>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      {src && <audio controls autoPlay src={src} style={{ width: '100%' }} />}
    </Box>
  );
}

function HeaderViewer({
  payload,
  children,
}: {
  payload: DesktopPreviewPayload;
  children: React.ReactNode;
}) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await loadMediaBlob(payload.mediaUrl, payload.mimeType, payload.encInfo);
      await saveFile(blob, payload.name);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box className={css.PreviewShell} direction="Column">
      <Header size="400">
        <Box grow="Yes" alignItems="Center" gap="200">
          <IconButton size="300" radii="300" onClick={() => window.close()}>
            <Icon size="50" src={Icons.Cross} />
          </IconButton>
          <Text size="T300" truncate>
            {payload.name}
          </Text>
        </Box>
        <Button
          variant="Primary"
          fill="Soft"
          size="300"
          radii="300"
          onClick={download}
          disabled={downloading}
          before={downloading ? <Spinner size="50" /> : <Icon size="50" src={Icons.Download} />}
        >
          <Text size="B300">Download</Text>
        </Button>
      </Header>
      <Box className={css.PreviewCenter} grow="Yes" alignItems="Center" justifyContent="Center">
        {children}
      </Box>
    </Box>
  );
}

function UnknownPreview({ payload }: { payload: DesktopPreviewPayload }) {
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await loadMediaBlob(payload.mediaUrl, payload.mimeType, payload.encInfo);
      await saveFile(blob, payload.name);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box direction="Column" alignItems="Center" justifyContent="Center" gap="200">
      <Icon size="600" src={getFileTypeIcon(payload.mimeType, true)} />
      <Text size="T300" truncate>
        {payload.name}
      </Text>
      <Text size="T200" priority="300">
        {payload.size ? bytesToSize(payload.size) : payload.mimeType}
      </Text>
      {payload.duration ? (
        <Text size="T200" priority="300">
          {secondsToMinutesAndSeconds(payload.duration / 1000)}
        </Text>
      ) : null}
      <Button
        variant="Primary"
        fill="Solid"
        size="400"
        radii="300"
        onClick={download}
        disabled={downloading}
        before={downloading ? <Spinner size="100" /> : <Icon size="200" src={Icons.Download} />}
      >
        <Text size="T300">Download</Text>
      </Button>
    </Box>
  );
}

function BlobViewer({ payload }: { payload: DesktopPreviewPayload }) {
  const [src, setSrc] = useState<string>();
  const [text, setText] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | undefined;

    setSrc(undefined);
    setText(undefined);
    setError(false);

    const load = async () => {
      try {
        const blob = await loadMediaBlob(payload.mediaUrl, payload.mimeType, payload.encInfo);
        if (!alive) return;
        if (payload.viewerType === 'text') {
          setText(await blob.text());
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (alive) setError(true);
      }
    };

    load();

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [payload]);

  if (error) {
    return <Text>Failed to load preview.</Text>;
  }

  if (payload.viewerType === 'audio') {
    return (
      <HeaderViewer payload={payload}>
        <PreviewAudio payload={payload} />
      </HeaderViewer>
    );
  }

  if (payload.viewerType === 'text' && text !== undefined) {
    return (
      <TextViewer
        className={css.PreviewShell}
        name={payload.name}
        text={text}
        langName={payload.langName ?? 'txt'}
        mimeType={payload.mimeType}
        requestClose={() => window.close()}
      />
    );
  }

  if (!src) {
    return <Spinner variant="Secondary" size="600" />;
  }

  if (payload.viewerType === 'image') {
    return (
      <ImageViewer
        className={css.PreviewShell}
        src={src}
        alt={payload.name}
        hideCloseButton
        requestClose={() => window.close()}
      />
    );
  }

  if (payload.viewerType === 'video') {
    return (
      <VideoViewer
        className={css.PreviewShell}
        name={payload.name}
        src={src}
        requestClose={() => window.close()}
      />
    );
  }

  if (payload.viewerType === 'pdf') {
    return (
      <PdfViewer
        className={css.PreviewShell}
        name={payload.name}
        src={src}
        requestClose={() => window.close()}
      />
    );
  }

  return <UnknownPreview payload={payload} />;
}

function PreviewApp() {
  const [payload, setPayload] = useState<DesktopPreviewPayload | undefined>(
    window.__ElevoPreview_initialPayload__
  );

  useEffect(() => {
    window.__ElevoPreview_receive__ = setPayload;
  }, []);

  return (
    <PreviewTheme>
      <Box className={css.PreviewShell} direction="Column">
        {payload?.viewerType === 'file' ? (
          <>
            <Header size="400">
              <Box grow="Yes" alignItems="Center" gap="200">
                <IconButton size="300" radii="300" onClick={() => window.close()}>
                  <Icon size="50" src={Icons.Cross} />
                </IconButton>
                <Text size="T300" truncate>
                  {payload.name}
                </Text>
              </Box>
            </Header>
            <Box className={css.PreviewCenter} grow="Yes" alignItems="Center" justifyContent="Center">
              <UnknownPreview payload={payload} />
            </Box>
          </>
        ) : payload ? (
          <BlobViewer key={`${payload.mediaUrl}:${payload.name}`} payload={payload} />
        ) : null}
      </Box>
    </PreviewTheme>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<PreviewApp />);
