import { useRef, useState, useEffect, useCallback } from "react";

interface UseAmbientAudioOptions {
  src: string;
  initialVolume?: number;
  fadeInDuration?: number;
  loop?: boolean;
}

const MUTE_KEY = "fj_audio_muted";

export function useAmbientAudio({
  src,
  initialVolume = 0.18,
  fadeInDuration = 1200,
  loop = true,
}: UseAmbientAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const unlockedRef = useRef(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");
  const [volume, setVolume] = useState(initialVolume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  // Create audio element once (lazy)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = loop;
    audio.volume = 0;
    audio.src = src;
    audioRef.current = audio;

    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [src, loop]);

  // Fade in helper
  const fadeIn = useCallback((targetVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

    const start = performance.now();
    const from = audio.volume;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / fadeInDuration, 1);
      // ease-out quad
      const eased = t * (2 - t);
      audio.volume = from + (targetVolume - from) * eased;
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, [fadeInDuration]);

  // Unlock and play — called on first user gesture
  const startPlayback = useCallback(async () => {
    if (unlockedRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.volume = 0;
      await audio.play();
      unlockedRef.current = true;
      setIsPlaying(true);
      setNeedsInteraction(false);

      if (!isMuted) {
        fadeIn(volume);
      }
    } catch {
      // Still blocked — keep waiting
    }
  }, [fadeIn, volume, isMuted]);

  // Global listener: unlock on ANY user gesture
  useEffect(() => {
    const handler = () => {
      if (!unlockedRef.current) {
        startPlayback();
      }
    };

    const events = ["click", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach(e => window.addEventListener(e, handler, { once: false, passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
    };
  }, [startPlayback]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    if (next) {
      audio.volume = 0;
    } else {
      fadeIn(volume);
    }
  }, [isMuted, volume, fadeIn]);

  // Update volume
  const changeVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = clamped;
    }
  }, [isMuted]);

  // Fade out and stop
  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

    const start = performance.now();
    const from = audio.volume;
    const duration = 500;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      audio.volume = from * (1 - t);
      if (t < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        fadeRef.current = null;
        audio.pause();
        setIsPlaying(false);
      }
    };
    fadeRef.current = requestAnimationFrame(tick);
  }, []);

  return {
    isPlaying,
    isMuted,
    volume,
    needsInteraction,
    toggleMute,
    changeVolume,
    startPlayback,
    stop,
  };
}
