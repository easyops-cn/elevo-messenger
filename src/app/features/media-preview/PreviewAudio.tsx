/* eslint-disable jsx-a11y/media-has-caption */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Chip, Icon, IconButton, Icons, ProgressBar, Spinner, Text, config } from 'folds';
import { Range } from 'react-range';
import type { IAudioInfo } from '../../../types/matrix/common';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
  useMediaVolume,
} from '../../hooks/media';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import { MediaControl } from '../../components/media/MediaControls';
import { WaveformPlayer } from '../../components/media/WaveformPlayer';

type PreviewAudioProps = {
  mimeType: string;
  info?: IAudioInfo;
  waveform?: number[];
  loadSrc: () => Promise<string>;
};

function PlainAudio({
  mimeType,
  durationSec,
  srcState,
  load,
}: {
  mimeType: string;
  durationSec: number;
  srcState: ReturnType<typeof useAsyncCallback<string, Error, []>>[0];
  load: ReturnType<typeof useAsyncCallback<string, Error, []>>[1];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);
  const { volume, mute, setMute, setVolume } = useMediaVolume(getAudioRef);

  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(getAudioRef, handlePlayTimeCallback);

  const pendingSeekRef = useRef<number | null>(null);

  useEffect(() => {
    if (srcState.status !== AsyncStatus.Success || pendingSeekRef.current === null) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const targetTime = pendingSeekRef.current;
    pendingSeekRef.current = null;
    const onLoaded = () => {
      audioEl.currentTime = targetTime;
      audioEl.removeEventListener('loadedmetadata', onLoaded);
    };
    audioEl.addEventListener('loadedmetadata', onLoaded);
  }, [srcState.status]);

  const handlePlay = () => {
    if (srcState.status === AsyncStatus.Success) {
      setPlaying(!playing);
    } else if (srcState.status !== AsyncStatus.Loading) {
      load();
    }
  };

  const handleProgressSeek = (time: number) => {
    if (srcState.status === AsyncStatus.Success) {
      seek(time);
    } else {
      pendingSeekRef.current = time;
      setCurrentTime(time);
    }
  };

  return (
    <MediaControl
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
            />
          )}
        />
      }
      leftControl={
        <>
          <Chip
            onClick={handlePlay}
            variant="Secondary"
            radii="300"
            disabled={srcState.status === AsyncStatus.Loading}
            before={
              srcState.status === AsyncStatus.Loading || loading ? (
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
                  style={{ width: 48 }}
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
              />
            )}
          />
        </>
      }
    >
      <audio controls={false} autoPlay ref={audioRef}>
        {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
      </audio>
    </MediaControl>
  );
}

export function PreviewAudio({ mimeType, info, waveform, loadSrc }: PreviewAudioProps) {
  const [srcState, load] = useAsyncCallback(useCallback(loadSrc, [loadSrc]));
  const hasWaveform = Array.isArray(waveform) && waveform.length > 0;
  const durationMs = info?.duration ?? 0;
  const durationSec = (durationMs >= 0 ? durationMs : 0) / 1000;

  if (hasWaveform) {
    return (
      <MediaControl
        style={{
          padding: config.space.S300,
        }}
      >
        <WaveformPlayer
          audioSrc={srcState.status === AsyncStatus.Success ? srcState.data : null}
          waveform={waveform}
          durationSec={durationSec}
          mimeType={mimeType}
          isLoading={srcState.status === AsyncStatus.Loading}
          onPlayClick={load}
          autoPlay
        />
      </MediaControl>
    );
  }

  return (
    <PlainAudio mimeType={mimeType} durationSec={durationSec} srcState={srcState} load={load} />
  );
}
