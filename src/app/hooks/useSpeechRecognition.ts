import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type SpeechRecognitionState = 'idle' | 'listening' | 'stopped';

export interface SpeechRecognitionControls {
  supported: boolean;
  state: SpeechRecognitionState;
  transcript: string;
  finalTranscript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionControls {
  const [state, setState] = useState<SpeechRecognitionState>('idle');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const { i18n } = useTranslation();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const interimRef = useRef('');

  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const createRecognition = useCallback((): SpeechRecognition | null => {
    if (!supported) return null;
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return null;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = i18n.language || navigator.language || 'en-US';
    return recognition;
  }, [supported, i18n.language]);

  const start = useCallback(() => {
    if (!supported || recognitionRef.current) return;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    listeningRef.current = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setFinalTranscript((prev) => prev + final);
      }
      interimRef.current = interim;
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (listeningRef.current) {
        const next = createRecognition();
        if (next) {
          recognitionRef.current = next;
          next.onresult = recognition.onresult;
          next.onerror = recognition.onerror;
          next.onend = recognition.onend;
          next.start();
          return;
        }
      }
      setState('stopped');
      setInterimTranscript('');
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('SpeechRecognition error:', event.error, event.message);
      listeningRef.current = false;
      setState('stopped');
      recognitionRef.current = null;
    };

    recognition.start();
    setState('listening');
  }, [supported, createRecognition]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    // Merge remaining interim text into final so nothing is lost
    if (interimRef.current) {
      setFinalTranscript((prev) => prev + interimRef.current);
      interimRef.current = '';
    }
    setState('stopped');
    setInterimTranscript('');
  }, []);

  const reset = useCallback(() => {
    listeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Already stopped
      }
      recognitionRef.current = null;
    }
    setState('idle');
    setFinalTranscript('');
    interimRef.current = '';
    setInterimTranscript('');
  }, []);

  return {
    supported,
    state,
    transcript: finalTranscript + interimTranscript,
    finalTranscript,
    start,
    stop,
    reset,
  };
}
