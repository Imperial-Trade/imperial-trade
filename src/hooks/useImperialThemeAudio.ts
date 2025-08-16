import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioNotifications } from './useAudioNotifications';

interface ImperialThemeAudioOptions {
  autoPlay?: boolean;
  respectQuietHours?: boolean;
  respectUserPreferences?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

interface ImperialThemeAudioState {
  isLoaded: boolean;
  isPlaying: boolean;
  isError: boolean;
  volume: number;
}

export const useImperialThemeAudio = (options: ImperialThemeAudioOptions = {}) => {
  const {
    autoPlay = true,
    respectQuietHours = true,
    respectUserPreferences = true,
    fadeInDuration = 1000,
    fadeOutDuration = 2000
  } = options;

  const [state, setState] = useState<ImperialThemeAudioState>({
    isLoaded: false,
    isPlaying: false,
    isError: false,
    volume: 0.6
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { isQuietHours } = useAudioNotifications();

  // Check if audio should be enabled based on user preferences
  const getAudioEnabled = useCallback(() => {
    return localStorage.getItem('audioNotifications') !== 'false';
  }, []);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio('/sounds/theme/imperial-welcome-theme.mp3');
    audio.preload = 'auto';
    audio.volume = 0; // Start at 0 for fade-in effect
    
    const handleCanPlayThrough = () => {
      setState(prev => ({ ...prev, isLoaded: true, isError: false }));
    };

    const handleError = () => {
      setState(prev => ({ ...prev, isError: true, isLoaded: false }));
      console.warn('Imperial theme audio failed to load, continuing without audio');
    };

    const handleEnded = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Fade animation utility
  const fadeAudio = useCallback((targetVolume: number, duration: number, onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const startVolume = audio.volume;
    const volumeChange = targetVolume - startVolume;
    const steps = 20; // 20 steps for smooth fade
    const stepDuration = duration / steps;
    const volumeStep = volumeChange / steps;

    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVolume = startVolume + (volumeStep * currentStep);
      audio.volume = Math.max(0, Math.min(1, newVolume));

      setState(prev => ({ ...prev, volume: newVolume }));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        audio.volume = targetVolume;
        setState(prev => ({ ...prev, volume: targetVolume }));
        onComplete?.();
      }
    }, stepDuration);
  }, []);

  // Play with fade-in
  const playTheme = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !state.isLoaded || state.isError) return false;

    // Check permissions and preferences
    const canPlay = respectUserPreferences ? getAudioEnabled() : true;
    const isQuiet = respectQuietHours ? isQuietHours : false;

    if (!canPlay || isQuiet) {
      console.log('Imperial theme audio skipped due to user preferences or quiet hours');
      return false;
    }

    try {
      audio.currentTime = 0;
      audio.volume = 0;
      
      await audio.play();
      setState(prev => ({ ...prev, isPlaying: true }));
      
      // Fade in
      fadeAudio(state.volume, fadeInDuration);
      
      return true;
    } catch (error) {
      console.warn('Failed to play Imperial theme audio:', error);
      setState(prev => ({ ...prev, isError: true }));
      return false;
    }
  }, [state.isLoaded, state.isError, state.volume, getAudioEnabled, isQuietHours, respectUserPreferences, respectQuietHours, fadeAudio, fadeInDuration]);

  // Stop with fade-out
  const stopTheme = useCallback((immediate = false) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (immediate) {
      audio.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    // Fade out then stop
    fadeAudio(0, fadeOutDuration, () => {
      if (audio) {
        audio.pause();
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    });
  }, [fadeAudio, fadeOutDuration]);

  // Schedule fade-out (for timeline synchronization)
  const scheduleFadeOut = useCallback((delay: number) => {
    setTimeout(() => {
      stopTheme();
    }, delay);
  }, [stopTheme]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setState(prev => ({ ...prev, volume: clampedVolume }));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // Check if audio should play based on current conditions
  const shouldPlay = useCallback(() => {
    if (!state.isLoaded || state.isError) return false;
    
    const canPlay = respectUserPreferences ? getAudioEnabled() : true;
    const isQuiet = respectQuietHours ? isQuietHours : false;
    
    return canPlay && !isQuiet;
  }, [state.isLoaded, state.isError, getAudioEnabled, isQuietHours, respectUserPreferences, respectQuietHours]);

  return {
    ...state,
    playTheme,
    stopTheme,
    scheduleFadeOut,
    setVolume,
    shouldPlay,
    canPlayAudio: state.isLoaded && !state.isError
  };
};