import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import {
  Badge,
  Box,
  Chip,
  Header,
  Icon,
  IconButton,
  Icons,
  ProgressBar,
  Spinner,
  Text,
  as,
  color,
  config,
  toRem,
} from 'folds';
import { useTranslation } from 'react-i18next';
import { Range } from 'react-range';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
  useMediaVolume,
} from '../../hooks/media';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import { MediaControl } from '../media/MediaControls';
import { WaveformPlayer } from '../media/WaveformPlayer';
import * as css from './AudioViewer.css';

export type BaseAudioInfo = {
  size?: number;
  duration?: number;
};

type BaseAudioViewerProps = {
  name: string;
  mimeType: string;
  info: BaseAudioInfo;
  waveform?: number[];
  src: string | null;
  loading?: boolean;
  downloading?: boolean;
  hideCloseButton?: boolean;
  requestClose: () => void;
  onDownload: () => Promise<void>;
  onPlayClick?: () => void;
};

type BaseAudioContentProps = {
  mimeType: string;
  src: string | null;
  info: BaseAudioInfo;
  isLoading: boolean;
  onPlayClick?: () => void;
};

function BaseAudioContent({
  mimeType,
  src,
  info,
  isLoading,
  onPlayClick,
}: BaseAudioContentProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const infoDuration = info.duration ?? 0;
  const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);
  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);
  const { volume, mute, setMute, setVolume } = useMediaVolume(getAudioRef);
  const pendingSeekRef = useRef<number | null>(null);
  const handlePlayTimeCallback: PlayTimeCallback = (d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  };
  useMediaPlayTimeCallback(getAudioRef, handlePlayTimeCallback);

  const handlePlay = () => {
    if (src) {
      setPlaying(!playing);
    } else if (!isLoading) {
      onPlayClick?.();
    }
  };

  const handleProgressSeek = (time: number) => {
    if (src) {
      seek(time);
    } else {
      pendingSeekRef.current = time;
      setCurrentTime(time);
    }
  };

  useEffect(() => {
    if (src && pendingSeekRef.current !== null) {
      const audioEl = audioRef.current;
      if (!audioEl) return;
      const targetTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const onLoaded = () => {
        audioEl.currentTime = targetTime;
        audioEl.removeEventListener('loadedmetadata', onLoaded);
      };
      audioEl.addEventListener('loadedmetadata', onLoaded);
    }
  }, [src]);

  return (
    <MediaControl
      className={css.AudioViewerControl}
      leftControl={
        <>
          <Chip
            onClick={handlePlay}
            variant="Secondary"
            radii="300"
            disabled={isLoading}
            before={
              isLoading || loading ? (
                <Spinner variant="Secondary" size="50" />
              ) : (
                <Icon src={playing ? Icons.Pause : Icons.Play} size="50" filled={playing} />
              )
            }
          >
            <Text size="B300">{playing ? 'Pause' : 'Play'}</Text>
          </Chip>

          <Text size="T200">{`${secondsToMinutesAndSeconds(
            currentTime
          )} / ${secondsToMinutesAndSeconds(duration)}`}</Text>
        </>
      }
      rightControl={
        <>
          <IconButton
            variant="SurfaceVariant"
            size="300"
            radii="Pill"
            onClick={() => setMute(!mute)}
            aria-pressed={mute}
          >
            <Icon src={mute ? Icons.VolumeMute : Icons.VolumeHigh} size="50" />
          </IconButton>
          <Range
            step={0.1}
            min={0}
            max={1}
            values={[volume]}
            onChange={(values) => setVolume(values[0])}
            renderTrack={(params) => (
              <div {...params.props}>
                {params.children}
                <ProgressBar
                  style={{ width: toRem(48) }}
                  variant="Secondary"
                  size="300"
                  min={0}
                  max={1}
                  value={volume}
                  radii="300"
                />
              </div>
            )}
            renderThumb={(params) => (
              <Badge
                size="300"
                variant="Secondary"
                fill="Solid"
                radii="Pill"
                outlined
                {...params.props}
                style={{
                  ...params.props.style,
                  zIndex: 0,
                }}
              />
            )}
          />
        </>
      }
      after={
        <Range
          step={1}
          min={0}
          max={duration || 1}
          values={[currentTime]}
          onChange={(values) => handleProgressSeek(values[0])}
          renderTrack={(params) => (
            <div {...params.props}>
              {params.children}
              <ProgressBar
                as="div"
                variant="Secondary"
                size="300"
                min={0}
                max={duration}
                value={currentTime}
                radii="300"
              />
            </div>
          )}
          renderThumb={(params) => (
            <Badge
              size="300"
              variant="Secondary"
              fill="Solid"
              radii="Pill"
              outlined
              {...params.props}
              style={{
                ...params.props.style,
                zIndex: 0,
              }}
            />
          )}
        />
      }
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls={false} autoPlay ref={audioRef}>
        {src && <source src={src} type={mimeType} />}
      </audio>
    </MediaControl>
  );
}

export const BaseAudioViewer = as<'div', BaseAudioViewerProps>(
  (
    {
      className,
      name,
      mimeType,
      info,
      waveform,
      src,
      loading = false,
      downloading = false,
      hideCloseButton,
      requestClose,
      onDownload,
      onPlayClick,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    const hasWaveform = Array.isArray(waveform) && waveform.length > 0;
    const infoDuration = info.duration ?? 0;
    const durationSec = (infoDuration >= 0 ? infoDuration : 0) / 1000;

    return (
      <Box
        className={classNames(css.AudioViewer, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.AudioViewerHeader} size="400">
          <Box grow="Yes" alignItems="Center" gap="200">
            {!hideCloseButton && (
              <IconButton size="300" radii="300" onClick={requestClose}>
                <Icon size="50" src={Icons.ArrowLeft} />
              </IconButton>
            )}
            <Text size="T300" truncate>
              {name}
            </Text>
          </Box>
          <Box shrink="No" alignItems="Center" gap="200">
            <IconButton
              variant="Primary"
              size="300"
              radii="300"
              onClick={onDownload}
              disabled={downloading}
              aria-label={t('viewer.download')}
            >
              {downloading ? <Spinner size="50" /> : <Icon size="50" src={Icons.Download} />}
            </IconButton>
          </Box>
        </Header>

        <Box
          grow="Yes"
          className={css.AudioViewerContent}
          justifyContent="Center"
          alignItems="Center"
        >
          <Box className={css.AudioViewerInner}>
            {hasWaveform ? (
              <Box
                className={css.AudioViewerControl}
                style={{
                  padding: config.space.S300,
                  backgroundColor: color.SurfaceVariant.Container,
                  color: color.SurfaceVariant.OnContainer,
                  borderRadius: config.radii.R400,
                }}
              >
                <WaveformPlayer
                  audioSrc={src}
                  waveform={waveform}
                  durationSec={durationSec}
                  mimeType={mimeType}
                  isLoading={loading}
                  onPlayClick={onPlayClick}
                  autoPlay
                />
              </Box>
            ) : (
              <BaseAudioContent
                mimeType={mimeType}
                src={src}
                info={info}
                isLoading={loading}
                onPlayClick={onPlayClick}
              />
            )}
          </Box>
        </Box>
      </Box>
    );
  }
);
