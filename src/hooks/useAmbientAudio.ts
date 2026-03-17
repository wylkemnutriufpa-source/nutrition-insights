import { useRef, useState, useEffect, useCallback } from "react";

interface UseAmbientAudioOptions {
  src: string;
  initialVolume?: number;
  fadeInDuration?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export function useAmbientAudio({
  src,
  initialVolume = 0.2,
  fadeInDuration = 1500,
  loop = true,
  autoplay = true,
}: UseAmbientAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [src, loop]);

  // Fade in helper
  const fadeIn = useCallback((targetVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const steps = 50;
    const stepTime = fadeInDuration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVol = Math.min(volumeStep * currentStep, targetVolume);
      audio.volume = newVol;
      if (currentStep >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, stepTime);
  }, [fadeInDuration]);

  // Attempt autoplay
  useEffect(() => {
    if (!autoplay || !audioRef.current) return;

    const audio = audioRef.current;
    const tryPlay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        fadeIn(volume);
      } catch {
        // Autoplay blocked — need user interaction
        setNeedsInteraction(true);
      }
    };

    // Small delay to let component mount
    const t = setTimeout(tryPlay, 300);
    return () => clearTimeout(t);
  }, [autoplay, fadeIn, volume]);

  // Handle user-triggered play (for mobile / autoplay-blocked)
  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setIsPlaying(true);
      setNeedsInteraction(false);
      fadeIn(volume);
    } catch {
      // still blocked
    }
  }, [fadeIn, volume]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

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

    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

    const steps = 15;
    const stepTime = 500 / steps;
    const currentVol = audio.volume;
    const volumeStep = currentVol / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVol = Math.max(currentVol - volumeStep * currentStep, 0);
      audio.volume = newVol;
      if (currentStep >= steps) {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        audio.pause();
        setIsPlaying(false);
      }
    }, stepTime);
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
