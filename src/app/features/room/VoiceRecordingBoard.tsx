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
  const recorder = useVoiceRecorder();
  const speech = useSpeechRecognition();
  const [recognizedText, setRecognizedText] = useState('');
  const [sendingText, setSendingText] = useState(false);
  useImperativeHandle(ref, () => ({
    stopRecording: () => {
      if (recorder.state === 'recording') {
        recorder.stop();
        return true;
      }
      return false;
    },
  }), [recorder]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Auto-start recording when board opens
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    recorder.start().then(() => {
      if (speech.supported) speech.start();
    }).catch((err: Error) => {
      setError(t(err.message) || t('voiceRecording.error.unknown'));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop speech recognition when recording stops, lock in final text
  useEffect(() => {
    if (recorder.state === 'stopped' && speech.state !== 'idle') {
      speech.stop();
      setRecognizedText(speech.finalTranscript);
    }
  }, [recorder.state, speech]);

  // Keep textarea in sync with live recognition during recording
  useEffect(() => {
    if (recorder.state === 'recording') {
      setRecognizedText(speech.transcript);
    }
  }, [recorder.state, speech.transcript]);

  // Create / revoke blob URL when recording stops
  useEffect(() => {
    if (recorder.state === 'stopped' && recorder.audioBlob) {
      const url = URL.createObjectURL(recorder.audioBlob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setBlobUrl(null);
      };
    }
    return undefined;
  }, [recorder.state, recorder.audioBlob]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      recorder.cancel();
      speech.reset();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
    } catch (err) {
      setError('Failed to send text message.');
    } finally {
      setSendingText(false);
    }
  };

  const handleSend = async () => {
    if (!recorder.audioBlob || sending) return;
    setSending(true);
    setError(null);
    try {
      const isEncrypted = room.hasEncryptionStateEvent();
      const ext = getExtFromMimeType(recorder.mimeType);
      const file = new File([recorder.audioBlob], `Voice message.${ext}`, {
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
              {isRecording && <div className={css.RecordingDot}><div className={css.RecordingDotInner} /></div>}
              {!isRecording && !error && <div className={css.IdleDot}><div className={css.IdleDotInner} /></div>}

              <LiveWaveform bars={recorder.liveWaveform} />

              <Text size="T200" style={{ minWidth: toRem(48), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {secondsToMinutesAndSeconds(recorder.elapsedSeconds)}
              </Text>
            </Box>
          )}

          {/* Preview phase */}
          {isStopped && blobUrl && (
            <WaveformPlayer
              audioSrc={blobUrl}
              waveform={recorder.finalWaveform}
              durationSec={recorder.durationMs / 1000}
              mimeType={recorder.mimeType}
            />
          )}

          {/* Speech recognition textarea */}
          {(isRecording || isStopped) && speech.supported && (
            <textarea
              className={css.SpeechTextArea}
              readOnly={isRecording}
              value={isRecording ? speech.transcript : recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              placeholder={t('voiceRecording.speechPlaceholder')}
              rows={2}
            />
          )}

          {/* Action buttons */}
          <div className={css.ActionBar}>
            {/* Left: Send Text */}
            {isStopped && speech.supported && recognizedText.trim() && (
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
            )}
            {!isStopped && <div />}

            {/* Right: voice controls */}
            {(recorder.state === 'idle' || isRecording) && (
              <Chip
                as="button"
                onClick={() => recorder.stop()}
                variant="SurfaceVariant"
                radii="Pill"
                after={<Icon src={Icons.MicMute} size="50" />}
                disabled={!isRecording}
              >
                <Text size="B300">{t('voiceRecording.stop')}</Text>
              </Chip>
            )}
            {isStopped && (
              <>
                <Chip
                  as="button"
                  onClick={handleCancel}
                  variant="SurfaceVariant"
                  radii="Pill"
                  after={<Icon src={Icons.Cross} size="50" />}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
