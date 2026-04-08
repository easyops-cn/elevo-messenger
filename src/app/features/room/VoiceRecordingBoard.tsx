import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Chip, Icon, Icons, Spinner, Text, color, toRem } from 'folds';
import { Room } from 'matrix-js-sdk';
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useVoiceRecorder, getExtFromMimeType } from '../../hooks/useVoiceRecorder';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { WaveformPlayer } from '../../components/media/WaveformPlayer';
import { encryptFile } from '../../utils/matrix';
import { getVoiceMsgContent } from './msgContent';
import { secondsToMinutesAndSeconds } from '../../utils/common';
import * as css from './VoiceRecordingBoard.css';

const MIN_BAR_HEIGHT = 2;
const MAX_BAR_HEIGHT = 32;
const MAX_LIVE_WAVEFORM_VALUE = 255;
const MAX_LIVE_BARS = 40;

// ─── Live waveform (recording phase) ──────────────────────────────────────────

type LiveWaveformProps = {
  bars: number[];
};

function LiveWaveform({ bars }: LiveWaveformProps) {
  const padding = Math.max(0, MAX_LIVE_BARS - bars.length);
  const displayBars = bars.length > 0
    ? Array(padding).fill(-1).concat(bars)
    : [];
  return (
    <div className={css.WaveformContainer}>
      {displayBars.map((value, index) => {
        const normalized = Math.max(value, 0);
        const h = normalized / MAX_LIVE_WAVEFORM_VALUE;
        const height = Math.max(MIN_BAR_HEIGHT, Math.sqrt(h) * MAX_BAR_HEIGHT);
        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={css.WaveformBar}
            style={{
              height: toRem(height),
              backgroundColor: color.Critical.Main,
              opacity: value < 0 ? 0.15 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main VoiceRecordingBoard ──────────────────────────────────────────────────

export type VoiceRecordingBoardHandlers = {
  /** Returns true if it stopped an active recording, false if already stopped/idle */
  stopRecording: () => boolean;
};

type VoiceRecordingBoardProps = {
  roomId: string;
  room: Room;
  onClose: () => void;
};

export const VoiceRecordingBoard = forwardRef<VoiceRecordingBoardHandlers, VoiceRecordingBoardProps>(({ roomId, room, onClose }, ref) => {
  const mx = useMatrixClient();
  const { t } = useTranslation();

  const {
    state: recorderState,
    liveWaveform,
    elapsedSeconds,
    audioBlob,
    finalWaveform,
    durationMs,
    mimeType,
    start: recorderStart,
    stop: recorderStop,
    cancel: recorderCancel,
  } = useVoiceRecorder();

  const {
    supported: speechSupported,
    state: speechState,
    transcript: speechTranscript,
    finalTranscript: speechFinalTranscript,
    start: speechStart,
    stop: speechStop,
    reset: speechReset,
  } = useSpeechRecognition();

  const [recognizedText, setRecognizedText] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const startedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    stopRecording: () => {
      if (recorderState === 'recording') {
        recorderStop();
        return true;
      }
      return false;
    },
  }), [recorderState, recorderStop]);

  // Auto-start recording when board opens
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recorderStart().then(() => {
      if (speechSupported) speechStart();
    }).catch((err: Error) => {
      setError(t(err.message) || t('voiceRecording.error.unknown'));
    });
  }, [recorderStart, speechSupported, speechStart, t]);

  // Stop speech recognition when recording stops
  useEffect(() => {
    if (recorderState === 'stopped' && speechState === 'listening') {
      speechStop();
    }
  }, [recorderState, speechState, speechStop]);

  // Lock in final text when speech recognition stops
  useEffect(() => {
    if (recorderState === 'stopped' && speechState === 'stopped' && speechFinalTranscript) {
      setRecognizedText(speechFinalTranscript);
    }
  }, [recorderState, speechState, speechFinalTranscript]);

  // Keep textarea in sync with live recognition during recording
  useEffect(() => {
    if (recorderState === 'recording') {
      setRecognizedText(speechTranscript);
    }
  }, [recorderState, speechTranscript]);

  // Create / revoke blob URL when recording stops
  useEffect(() => {
    if (recorderState === 'stopped' && audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setBlobUrl(null);
      };
    }
    return undefined;
  }, [recorderState, audioBlob]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      recorderCancel();
      speechReset();
    },
    [recorderCancel, speechReset]
  );

  const handleSendText = async () => {
    const text = recognizedText.trim();
    if (!text || sendingText) return;
    setSendingText(true);
    try {
      mx.sendMessage(roomId, {
        msgtype: 'm.text',
        body: text,
      } as any);
      setRecognizedText('');
      onClose();
    } catch (err) {
      setError('Failed to send text message.');
    } finally {
      setSendingText(false);
    }
  };

  const handleSend = async () => {
    if (!audioBlob || sending) return;
    setSending(true);
    setError(null);
    try {
      const isEncrypted = room.hasEncryptionStateEvent();
      const ext = getExtFromMimeType(mimeType);
      const file = new File([audioBlob], `Voice message.${ext}`, {
        type: mimeType,
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
        durationMs,
        finalWaveform
      );
      mx.sendMessage(roomId, content as any);
      onClose();
    } catch (err) {
      setError('Failed to send voice message. Please try again.');
      setSending(false);
    }
  };

  const handleCancel = () => {
    recorderCancel();
    onClose();
  };

  const isRecording = recorderState === 'recording';
  const isStopped = recorderState === 'stopped';

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
          {(recorderState === 'idle' || isRecording) && (
            <Box alignItems="Center" gap="200">
              {isRecording && <div className={css.RecordingDot}><div className={css.RecordingDotInner} /></div>}
              {!isRecording && !error && <div className={css.IdleDot}><div className={css.IdleDotInner} /></div>}

              <LiveWaveform bars={liveWaveform} />

              <Text size="T200" style={{ minWidth: toRem(48), marginLeft: 'auto', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {secondsToMinutesAndSeconds(elapsedSeconds)}
              </Text>
            </Box>
          )}

          {/* Preview phase */}
          {isStopped && blobUrl && (
            <WaveformPlayer
              audioSrc={blobUrl}
              waveform={finalWaveform}
              durationSec={durationMs / 1000}
              mimeType={mimeType}
            />
          )}

          {/* Speech recognition textarea */}
          {(isRecording || isStopped) && speechSupported && (
            <textarea
              className={css.SpeechTextArea}
              readOnly={isRecording}
              value={isRecording ? speechTranscript : recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              placeholder={t('voiceRecording.speechPlaceholder')}
              rows={3}
            />
          )}

          {/* Action buttons */}
          <div className={css.ActionBar}>
            {/* Left: Send Text */}
            {isStopped && speechSupported && recognizedText.trim() ? (
              <Chip
                as="button"
                onClick={handleSendText}
                variant="SurfaceVariant"
                radii="Pill"
                disabled={sendingText}
                after={sendingText ? <Spinner size="50" /> : <Icon src={Icons.Send} size="50" />}
              >
                <Text size="B300">{t('voiceRecording.sendText')}</Text>
              </Chip>
            ) : <div />}

            {/* Right: voice controls */}
            {(recorderState === 'idle' || isRecording) && (
              <Chip
                as="button"
                onClick={() => recorderStop()}
                variant="SurfaceVariant"
                radii="Pill"
                after={<Icon src={Icons.MicMute} size="50" />}
                disabled={!isRecording}
              >
                <Text size="B300">{t('voiceRecording.stop')}</Text>
              </Chip>
            )}
            {isStopped && (
              <div className={css.ActionBarRight}>
                <Chip
                  as="button"
                  onClick={handleCancel}
                  variant="SurfaceVariant"
                  radii="Pill"
                >
                  <Text size="B300">{t('voiceRecording.cancel')}</Text>
                </Chip>
                <Chip
                  as="button"
                  onClick={handleSend}
                  variant="Primary"
                  radii="Pill"
                  outlined
                  disabled={sending}
                  after={sending ? <Spinner size="50" variant="Primary" /> : <Icon src={Icons.Send} size="50" filled />}
                >
                  <Text size="B300">{t('voiceRecording.send')}</Text>
                </Chip>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
