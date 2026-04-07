import { useEffect, useRef } from 'react';

export type PlayTimeCallback = (duration: number, currentTime: number) => void;

export const useMediaPlayTimeCallback = (
  getTargetElement: () => HTMLMediaElement | null,
  onPlayTimeCallback: PlayTimeCallback
): void => {
  const cbRef = useRef(onPlayTimeCallback);
  cbRef.current = onPlayTimeCallback;

  useEffect(() => {
    const targetEl = getTargetElement();
    if (!targetEl) return;

    let rafId: number;

    const onLoadedMetadata = () => {
      cbRef.current(targetEl.duration, targetEl.currentTime);
    };

    const onEnded = () => {
      cancelAnimationFrame(rafId);
      cbRef.current(targetEl.duration, targetEl.currentTime);
    };

    const tick = () => {
      cbRef.current(targetEl.duration, targetEl.currentTime);
      rafId = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      rafId = requestAnimationFrame(tick);
    };

    const onPause = () => {
      cancelAnimationFrame(rafId);
      cbRef.current(targetEl.duration, targetEl.currentTime);
    };

    const onSeeked = () => {
      cbRef.current(targetEl.duration, targetEl.currentTime);
    };

    targetEl.addEventListener('loadedmetadata', onLoadedMetadata);
    targetEl.addEventListener('ended', onEnded);
    targetEl.addEventListener('play', onPlay);
    targetEl.addEventListener('pause', onPause);
    targetEl.addEventListener('seeked', onSeeked);

    // In case the audio is already playing when the effect runs
    if (!targetEl.paused) {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafId);
      targetEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      targetEl.removeEventListener('ended', onEnded);
      targetEl.removeEventListener('play', onPlay);
      targetEl.removeEventListener('pause', onPause);
      targetEl.removeEventListener('seeked', onSeeked);
    };
  }, [getTargetElement]);
};
