import React, { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Icon, IconButton, Icons, Spinner, Text, color, toRem } from 'folds';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
} from '../../hooks/media';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import * as css from './WaveformPlayer.css';

const MAX_BARS = 40;
const MIN_BAR_HEIGHT = 2;
const MAX_BAR_HEIGHT = 32;
const MAX_WAVEFORM_VALUE = 1024;

function sampleWaveform(waveform: number[], maxBars: number): number[] {
  if (waveform.length <= maxBars) return waveform;
  const chunkSize = waveform.length / maxBars;
  const sampled: number[] = [];
  for (let i = 0; i < maxBars; i += 1) {
    const start = Math.floor(i * chunkSize);
    const end = Math.floor((i + 1) * chunkSize);
    let max = 0;
    for (let j = start; j < end; j += 1) {
      if (waveform[j] > max) max = waveform[j];
    }
    sampled.push(max);
  }
  return sampled;
}

export type WaveformPlayerProps = {
  audioSrc: string | null;
  waveform: number[];
  durationSec: number;
  mimeType: string;
  isLoading?: boolean;
  onPlayClick?: () => void;
  autoPlay?: boolean;
};

export function WaveformPlayer({
  audioSrc,
  waveform,
  durationSec,
  mimeType,
  isLoading = false,
  onPlayClick,
  autoPlay = false,
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [isDragging, setIsDragging] = useState(false);

  const prevSrcRef = useRef<string | null>(audioSrc);
  const pendingSeekRef = useRef<number | null>(null);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);

  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(getAudioRef, handlePlayTimeCallback);

  // Apply pending seek when audio source becomes available
  useEffect(() => {
    if (audioSrc && prevSrcRef.current === null && pendingSeekRef.current !== null) {
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
    prevSrcRef.current = audioSrc;
  }, [audioSrc]);

  const bars = useMemo(() => sampleWaveform(waveform, MAX_BARS), [waveform]);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handlePlay = () => {
    if (audioSrc) {
      setPlaying(!playing);
    } else if (onPlayClick) {
      onPlayClick();
    }
  };

  const seekToPosition = useCallback(
    (clientX: number) => {
      const el = waveformRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = ratio * duration;
      if (audioSrc) {
        seek(targetTime);
        setCurrentTime(targetTime);
      } else if (!isLoading) {
        pendingSeekRef.current = targetTime;
        setCurrentTime(targetTime);
      }
    },
    [audioSrc, duration, isLoading, seek],
  );

  const handleWaveformClick = (evt: MouseEvent<HTMLDivElement>) => {
    seekToPosition(evt.clientX);
  };

  const handleWaveformMouseDown = (evt: MouseEvent<HTMLDivElement>) => {
    evt.preventDefault();
    setIsDragging(true);
    seekToPosition(evt.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (evt: globalThis.MouseEvent) => {
      seekToPosition(evt.clientX);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, seekToPosition]);

  const isLoadingFinal = isLoading || loading;
  const displayTime = playing || currentTime > 0 ? currentTime : duration;

  return (
    <Box className={css.WaveformPlayerContainer} alignItems="Center">
      <IconButton
        variant="Secondary"
        size="300"
        radii="Pill"
        fill="None"
        onClick={handlePlay}
        disabled={isLoadingFinal}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {isLoadingFinal ? (
          <Spinner variant="Secondary" size="50" />
        ) : (
          <Icon src={playing ? Icons.Pause : Icons.Play} size="50" filled={playing} />
        )}
      </IconButton>

      <div
        ref={waveformRef}
        className={css.WaveformContainer}
        onClick={handleWaveformClick}
        onMouseDown={handleWaveformMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seek(Math.min(currentTime + 5, duration));
          if (e.key === 'ArrowLeft') seek(Math.max(currentTime - 5, 0));
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration || 1}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        {bars.map((value, index) => {
          const normalized = Math.min(value, MAX_WAVEFORM_VALUE) / MAX_WAVEFORM_VALUE;
          const height = Math.max(MIN_BAR_HEIGHT, Math.sqrt(normalized) * MAX_BAR_HEIGHT);
          const barProgress = (index + 0.5) / bars.length;
          const played = barProgress <= progress;

          return (
            // eslint-disable-next-line react/no-array-index-key
            <div
              key={index}
              className={css.WaveformBar}
              style={{
                height: toRem(height),
                backgroundColor: played ? color.Secondary.Main : color.Secondary.Container,
              }}
            />
          );
        })}
      </div>

      <Text className={css.TimeText} size="T200">
        {secondsToMinutesAndSeconds(displayTime)}
      </Text>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls={false} autoPlay={autoPlay} ref={audioRef}>
        {audioSrc && <source src={audioSrc} type={mimeType} />}
      </audio>
    </Box>
  );
}
