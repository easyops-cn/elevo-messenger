import { useCallback, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'stopped';

const MIME_TYPES = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'];
const MAX_LIVE_BARS = 40;
const MAX_FINAL_BARS = 100;
const MAX_DURATION_SECONDS = 300;

function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_TYPES.find((mt) => MediaRecorder.isTypeSupported(mt)) ?? '';
}

function downsample(data: number[], maxBars: number): number[] {
  if (data.length === 0) return [];
  if (data.length <= maxBars) return data;
  const chunkSize = data.length / maxBars;
  const result: number[] = [];
  for (let i = 0; i < maxBars; i += 1) {
    const start = Math.floor(i * chunkSize);
    const end = Math.floor((i + 1) * chunkSize);
    let max = 0;
    for (let j = start; j < end; j += 1) {
      if (data[j] > max) max = data[j];
    }
    result.push(max);
  }
  return result;
}

export interface VoiceRecorderControls {
  state: RecorderState;
  liveWaveform: number[];
  elapsedSeconds: number;
  audioBlob: Blob | null;
  finalWaveform: number[];
  durationMs: number;
  mimeType: string;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

export function useVoiceRecorder(): VoiceRecorderControls {
  const [state, setState] = useState<RecorderState>('idle');
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [finalWaveform, setFinalWaveform] = useState<number[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [mimeType, setMimeType] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allPeaksRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  // Keep a ref for stop so we can call it from start's timer
  const stopRef = useRef<(() => void) | null>(null);

  const cleanupResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    // setState('stopped') is called by recorder.onstop
  }, []);

  stopRef.current = stop;

  const start = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('voiceRecording.error.unsupported');
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasAudioInput = devices.some((d) => d.kind === 'audioinput');
    if (!hasAudioInput) {
      throw new Error('voiceRecording.error.noDevice');
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        throw new Error('voiceRecording.error.permissionDenied');
      }
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        throw new Error('voiceRecording.error.notFound');
      }
      throw new Error('voiceRecording.error.unknown');
    }
    streamRef.current = stream;

    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    const mime = getBestMimeType();
    setMimeType(mime);

    allPeaksRef.current = [];
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);
    setLiveWaveform([]);
    setAudioBlob(null);
    setFinalWaveform([]);
    setState('recording');

    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorderRef.current = recorder;
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const duration = Date.now() - startTimeRef.current;
      const actualMime = recorder.mimeType || mime;
      const blob = new Blob(chunks, { type: actualMime });
      const peaks = allPeaksRef.current;
      // scale 0-255 to 0-1024 for Matrix spec
      const final = downsample(peaks, MAX_FINAL_BARS).map((v) => Math.round((v / 255) * 1024));
      setDurationMs(duration);
      setAudioBlob(blob);
      setFinalWaveform(final);
      setMimeType(actualMime);
      setState('stopped');
    };

    recorder.start();

    // Timer: update elapsed seconds and enforce max duration
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= MAX_DURATION_SECONDS) {
        stopRef.current?.();
      }
    }, 1000);

    // Waveform sampling at ~50ms intervals
    const dataArray = new Uint8Array(analyser.fftSize);
    let lastSampleTime = 0;
    const tick = (now: number) => {
      if (now - lastSampleTime >= 50) {
        lastSampleTime = now;
        analyser.getByteTimeDomainData(dataArray);
        let peak = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const amplitude = Math.abs(dataArray[i] - 128) * 2;
          if (amplitude > peak) peak = amplitude;
        }
        allPeaksRef.current.push(peak);
        setLiveWaveform((prev) => {
          const next = [...prev, peak];
          return next.length > MAX_LIVE_BARS ? next.slice(next.length - MAX_LIVE_BARS) : next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove onstop so it doesn't transition to 'stopped'
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanupResources();
    setState('idle');
    setLiveWaveform([]);
    setElapsedSeconds(0);
    setAudioBlob(null);
    setFinalWaveform([]);
    setDurationMs(0);
  }, [cleanupResources]);

  return {
    state,
    liveWaveform,
    elapsedSeconds,
    audioBlob,
    finalWaveform,
    durationMs,
    mimeType,
    start,
    stop,
    cancel,
  };
}
