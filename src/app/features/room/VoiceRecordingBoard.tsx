import React, { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Chip, Icon, IconButton, Icons, Spinner, Text, color, toRem } from 'folds';
import { Room } from 'matrix-js-sdk';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import {
  PlayTimeCallback,
  useMediaLoading,
  useMediaPlay,
  useMediaPlayTimeCallback,
  useMediaSeek,
} from '../../hooks/media';
import { encryptFile } from '../../utils/matrix';
import { getVoiceMsgContent } from './msgContent';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import * as css from './VoiceRecordingBoard.css';

const MIN_BAR_HEIGHT = 2;
const MAX_BAR_HEIGHT = 32;
const MAX_WAVEFORM_VALUE = 1024;

// ─── Live waveform (recording phase) ──────────────────────────────────────────

type LiveWaveformProps = {
  bars: number[];
};

function LiveWaveform({ bars }: LiveWaveformProps) {
  return (
    <div className={css.WaveformContainer}>
      {bars.map((value, index) => {
        const normalized = Math.min(value, MAX_WAVEFORM_VALUE) / MAX_WAVEFORM_VALUE;
        const height = Math.max(MIN_BAR_HEIGHT, Math.sqrt(normalized) * MAX_BAR_HEIGHT);
        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={css.WaveformBar}
            style={{
              height: toRem(height),
              backgroundColor: color.Critical.Main,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Preview player (stopped phase) ───────────────────────────────────────────

type PreviewPlayerProps = {
  blobUrl: string;
  mimeType: string;
  durationMs: number;
  waveform: number[];
};

function PreviewPlayer({ blobUrl, mimeType, durationMs, waveform }: PreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs / 1000);

  const getAudioRef = useCallback(() => audioRef.current, []);
  const { loading } = useMediaLoading(getAudioRef);
  const { playing, setPlaying } = useMediaPlay(getAudioRef);
  const { seek } = useMediaSeek(getAudioRef);

  const handlePlayTimeCallback: PlayTimeCallback = useCallback((d, ct) => {
    setDuration(d);
    setCurrentTime(ct);
  }, []);
  useMediaPlayTimeCallback(getAudioRef, handlePlayTimeCallback);

  const progress = duration > 0 ? currentTime / duration : 0;

  const handleWaveformClick = (evt: MouseEvent<HTMLDivElement>) => {
    const rect = evt.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const displayTime = playing || currentTime > 0 ? currentTime : duration;

  return (
    <Box alignItems="Center" gap="200">
      <IconButton
        variant="Secondary"
        size="300"
        radii="Pill"
        onClick={() => setPlaying(!playing)}
        disabled={loading}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {loading ? (
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
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {waveform.map((value, index) => {
          const normalized = Math.min(value, MAX_WAVEFORM_VALUE) / MAX_WAVEFORM_VALUE;
          const height = Math.max(MIN_BAR_HEIGHT, Math.sqrt(normalized) * MAX_BAR_HEIGHT);
          const barProgress = (index + 0.5) / waveform.length;
          const played = barProgress <= progress;
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
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

      <Text size="T200" style={{ minWidth: toRem(48), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {secondsToMinutesAndSeconds(displayTime)}
      </Text>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls={false} autoPlay={false} ref={audioRef}>
        <source src={blobUrl} type={mimeType} />
      </audio>
    </Box>
  );
}

// ─── Main VoiceRecordingBoard ──────────────────────────────────────────────────

type VoiceRecordingBoardProps = {
  roomId: string;
  room: Room;
  onClose: () => void;
};

export function VoiceRecordingBoard({ roomId, room, onClose }: VoiceRecordingBoardProps) {
  const mx = useMatrixClient();
  const recorder = useVoiceRecorder();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  // Auto-start recording when board opens
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recorder.start().catch((err: Error) => {
      setError(err.message || 'Failed to access microphone');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create / revoke blob URL when recording stops
  useEffect(() => {
    if (recorder.state === 'stopped' && recorder.audioBlob) {
      const url = URL.createObjectURL(recorder.audioBlob);
      blobUrlRef.current = url;
      return () => {
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
      };
    }
    return undefined;
  }, [recorder.state, recorder.audioBlob]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      recorder.cancel();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSend = async () => {
    if (!recorder.audioBlob || sending) return;
    setSending(true);
    setError(null);
    try {
      const isEncrypted = room.hasEncryptionStateEvent();
      const file = new File([recorder.audioBlob], 'Voice message.ogg', {
        type: recorder.mimeType,
      });

      let mxc: string;
      let encInfo: EncryptedAttachmentInfo | undefined;

      if (isEncrypted) {
        const encrypted = await encryptFile(file);
        encInfo = encrypted.encInfo;
        const uploadResult = await mx.uploadContent(encrypted.file);
        mxc = uploadResult?.content_uri ?? '';
      } else {
        const uploadResult = await mx.uploadContent(file);
        mxc = uploadResult?.content_uri ?? '';
      }

      if (!mxc) throw new Error('Upload failed');

      const content = getVoiceMsgContent(
        { file, encInfo },
        mxc,
        recorder.durationMs,
        recorder.finalWaveform
      );
      mx.sendMessage(roomId, content as any);
      onClose();
    } catch (err) {
      setError('Failed to send voice message. Please try again.');
      setSending(false);
    }
  };

  const handleCancel = () => {
    recorder.cancel();
    onClose();
  };

  const isRecording = recorder.state === 'recording';
  const isStopped = recorder.state === 'stopped';

  return (
    <div className={css.VoiceRecordingBoardBase}>
      <div className={css.VoiceRecordingBoardContainer}>
        <div className={css.VoiceRecordingBoard}>
          {error && (
            <Text size="T200" className={css.ErrorText}>
              {error}
            </Text>
          )}

          {/* Recording phase */}
          {(recorder.state === 'idle' || isRecording) && (
            <Box alignItems="Center" gap="200">
              {isRecording && <div className={css.RecordingDot} />}
              {!isRecording && !error && <Spinner variant="Secondary" size="200" />}

              <LiveWaveform bars={recorder.liveWaveform} />

              <Text size="T200" style={{ minWidth: toRem(48), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {secondsToMinutesAndSeconds(recorder.elapsedSeconds)}
              </Text>
            </Box>
          )}

          {/* Preview phase */}
          {isStopped && blobUrlRef.current && (
            <PreviewPlayer
              blobUrl={blobUrlRef.current}
              mimeType={recorder.mimeType}
              durationMs={recorder.durationMs}
              waveform={recorder.finalWaveform}
            />
          )}

          {/* Action buttons */}
          <Box justifyContent="End" gap="200">
            {isRecording && (
              <Chip
                as="button"
                onClick={() => recorder.stop()}
                variant="SurfaceVariant"
                radii="Pill"
                after={<Icon src={Icons.MicMute} size="50" />}
              >
                <Text size="B300">Stop</Text>
              </Chip>
            )}
            <Chip
              as="button"
              onClick={handleCancel}
              variant="SurfaceVariant"
              radii="Pill"
              after={<Icon src={Icons.Cross} size="50" />}
            >
              <Text size="B300">Cancel</Text>
            </Chip>
            {isStopped && (
              <Chip
                as="button"
                onClick={handleSend}
                variant="Primary"
                radii="Pill"
                outlined
                disabled={sending}
                after={sending ? <Spinner size="50" variant="Primary" /> : <Icon src={Icons.Send} size="50" filled />}
              >
                <Text size="B300">Send</Text>
              </Chip>
            )}
          </Box>
        </div>
      </div>
    </div>
  );
}
