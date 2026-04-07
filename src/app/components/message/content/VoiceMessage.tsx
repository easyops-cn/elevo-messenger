/* eslint-disable jsx-a11y/media-has-caption */
import React, { MouseEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Box, Icon, IconButton, Icons, Spinner, Text, color, toRem } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
} from '../../../hooks/media';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import * as css from './VoiceMessage.css';


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

const MAX_WAVEFORM_VALUE = 1024;
const MAX_BARS = 40;
const MIN_BAR_HEIGHT = 2;
const MAX_BAR_HEIGHT = 32;

export type VoiceMessageProps = {
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  waveform: number[];
};
export function VoiceMessage({
  mimeType,
  url,
  info,
  encInfo,
  waveform,
}: VoiceMessageProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();

  const [srcState, loadSrc] = useAsyncCallback(
    useCallback(async () => {
      const mediaUrl = mxcUrlToHttp(mx, url, useAuthentication);
      if (!mediaUrl) throw new Error('Invalid media URL');
      const fileContent = encInfo
        ? await downloadEncryptedMedia(mediaUrl, (encBuf) => decryptFile(encBuf, mimeType, encInfo))
        : await downloadMedia(mediaUrl);
      return URL.createObjectURL(fileContent);
    }, [mx, url, useAuthentication, mimeType, encInfo])
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const infoDuration = info.duration ?? 0;
  const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);
  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(getAudioRef, handlePlayTimeCallback);

  const handlePlay = () => {
    if (srcState.status === AsyncStatus.Success) {
      setPlaying(!playing);
    } else if (srcState.status !== AsyncStatus.Loading) {
      loadSrc();
    }
  };

  const bars = useMemo(() => sampleWaveform(waveform, MAX_BARS), [waveform]);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleWaveformClick = (evt: MouseEvent<HTMLDivElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = ratio * duration;
    if (srcState.status === AsyncStatus.Success) {
      seek(targetTime);
    } else if (srcState.status !== AsyncStatus.Loading) {
      loadSrc();
    }
  };

  const isLoading = srcState.status === AsyncStatus.Loading || loading;
  const displayTime = playing || currentTime > 0 ? currentTime : duration;

  return (
    <Box className={css.VoiceMessageContainer} alignItems="Center">
      <IconButton
        variant="Secondary"
        size="300"
        radii="Pill"
        onClick={handlePlay}
        disabled={isLoading}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Spinner variant="Secondary" size="50" />
        ) : (
          <Icon src={playing ? Icons.Pause : Icons.Play} size="50" filled={playing} />
        )}
      </IconButton>

      <div
        className={css.WaveformContainer}
        onClick={handleWaveformClick}
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
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className={css.WaveformBar}
              style={{
                height: toRem(height),
                backgroundColor: played
                  ? color.Secondary.Main
                  : color.Secondary.Container,
              }}
            />
          );
        })}
      </div>

      <Text className={css.TimeText} size="T200">
        {secondsToMinutesAndSeconds(displayTime)}
      </Text>

      <audio controls={false} autoPlay ref={audioRef}>
        {srcState.status === AsyncStatus.Success && (
          <source src={srcState.data} type={mimeType} />
        )}
      </audio>
    </Box>
  );
}
