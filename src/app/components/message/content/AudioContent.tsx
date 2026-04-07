/* eslint-disable jsx-a11y/media-has-caption */
import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Chip, Icon, IconButton, Icons, ProgressBar, Spinner, Text, toRem } from 'folds';
import { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import { Range } from 'react-range';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IAudioInfo } from '../../../../types/matrix/common';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
  useMediaVolume,
} from '../../../hooks/media';
import { secondsToMinutesAndSeconds } from '../../../utils/common';
import {
  decryptFile,
  downloadEncryptedMedia,
  downloadMedia,
  mxcUrlToHttp,
} from '../../../utils/matrix';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';


type RenderMediaControlProps = {
  after: ReactNode;
  leftControl: ReactNode;
  rightControl: ReactNode;
  children: ReactNode;
};
export type AudioContentProps = {
  mimeType: string;
  url: string;
  info: IAudioInfo;
  encInfo?: EncryptedAttachmentInfo;
  renderMediaControl: (props: RenderMediaControlProps) => ReactNode;
};
export function AudioContent({
  mimeType,
  url,
  info,
  encInfo,
  renderMediaControl,
}: AudioContentProps) {
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
  // duration in seconds. (NOTE: info.duration is in milliseconds)
  const infoDuration = info.duration ?? 0;
  const [duration, setDuration] = useState((infoDuration >= 0 ? infoDuration : 0) / 1000);

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
    if (srcState.status === AsyncStatus.Success && pendingSeekRef.current !== null) {
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
  }, [srcState.status]);

  const handlePlay = () => {
    if (srcState.status === AsyncStatus.Success) {
      setPlaying(!playing);
    } else if (srcState.status !== AsyncStatus.Loading) {
      loadSrc();
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

  return renderMediaControl({
    after: (
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
    ),
    leftControl: (
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
    ),
    rightControl: (
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
    ),
    children: (
      <audio controls={false} autoPlay ref={audioRef}>
        {srcState.status === AsyncStatus.Success && <source src={srcState.data} type={mimeType} />}
      </audio>
    ),
  });
}
