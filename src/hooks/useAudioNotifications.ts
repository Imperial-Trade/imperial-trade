import { useCallback, useRef } from 'react';
import { useEnhancedHaptics } from './useEnhancedHaptics';

interface AudioNotificationOptions {
  type: 'critical' | 'important' | 'standard' | 'info';
  volume?: number;
  respectQuietHours?: boolean;
  forcePlay?: boolean;
}

interface NotificationSound {
  frequency: number;
  duration: number;
  pattern: number[];
  gain: number;
}

const NOTIFICATION_SOUNDS: Record<string, NotificationSound> = {
  critical: {
    frequency: 400,
    duration: 1200,
    pattern: [0.3, 0.1, 0.3, 0.1, 0.3], // Urgent triple beep
    gain: 0.25
  },
  important: {
    frequency: 800,
    duration: 800,
    pattern: [0.4, 0.2, 0.4], // Success double tone
    gain: 0.2
  },
  standard: {
    frequency: 600,
    duration: 600,
    pattern: [0.5], // Single clean tone
    gain: 0.15
  },
  info: {
    frequency: 500,
    duration: 400,
    pattern: [0.2], // Soft notification
    gain: 0.1
  }
};

export const useAudioNotifications = () => {
  const { triggerHaptic } = useEnhancedHaptics();
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    return audioContextRef.current;
  }, []);

  const isQuietHours = useCallback(() => {
    try {
      const quietSettings = localStorage.getItem('notification_quiet_hours');
      if (!quietSettings) return false;

      const { start, end } = JSON.parse(quietSettings);
      const now = new Date();
      const currentTime = now.getHours() * 100 + now.getMinutes();
      const startTime = parseInt(start.replace(':', ''));
      const endTime = parseInt(end.replace(':', ''));

      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Overnight quiet hours (e.g., 22:00 to 06:00)
        return currentTime >= startTime || currentTime <= endTime;
      }
    } catch {
      return false;
    }
  }, []);

  const shouldPlayAudio = useCallback((options: AudioNotificationOptions) => {
    // Check if audio is globally disabled
    const audioEnabled = localStorage.getItem('notification_audio_enabled') !== 'false';
    if (!audioEnabled && !options.forcePlay) return false;

    // Check quiet hours
    if (options.respectQuietHours !== false && isQuietHours()) {
      // Only play critical alerts during quiet hours
      return options.type === 'critical';
    }

    // Check document visibility (don't play if tab is hidden unless critical)
    if (document.hidden && options.type !== 'critical') return false;

    return true;
  }, [isQuietHours]);

  const playTone = useCallback(async (
    audioContext: AudioContext,
    frequency: number,
    duration: number,
    gain: number,
    startTime: number
  ) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);

    return new Promise<void>((resolve) => {
      oscillator.onended = () => resolve();
    });
  }, []);

  const playNotificationSound = useCallback(async (options: AudioNotificationOptions) => {
    // Prevent overlapping audio
    if (isPlayingRef.current) return false;

    if (!shouldPlayAudio(options)) return false;

    const audioContext = getAudioContext();
    if (!audioContext) return false;

    const sound = NOTIFICATION_SOUNDS[options.type];
    if (!sound) return false;

    try {
      isPlayingRef.current = true;
      
      // Resume audio context if suspended (required for iOS)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      let currentTime = audioContext.currentTime;
      const volume = options.volume || 1;

      // Play pattern of tones
      for (let i = 0; i < sound.pattern.length; i++) {
        const toneDuration = sound.pattern[i];
        await playTone(
          audioContext,
          sound.frequency,
          toneDuration,
          sound.gain * volume,
          currentTime
        );
        currentTime += toneDuration + 0.1; // Small gap between tones
      }

      // Trigger corresponding haptic feedback
      triggerHaptic(options.type, {
        pattern: sound.pattern.map(p => Math.round(p * 1000)),
        duration: sound.duration,
        intensity: options.type === 'critical' ? 1 : 0.7
      });

      return true;
    } catch (error) {
      console.warn('Audio notification failed:', error);
      return false;
    } finally {
      // Reset playing flag after total duration
      setTimeout(() => {
        isPlayingRef.current = false;
      }, sound.duration + 200);
    }
  }, [shouldPlayAudio, getAudioContext, playTone, triggerHaptic]);

  const playTestSound = useCallback(async (type: AudioNotificationOptions['type']) => {
    return playNotificationSound({
      type,
      forcePlay: true,
      respectQuietHours: false,
      volume: 0.8
    });
  }, [playNotificationSound]);

  const setQuietHours = useCallback((start: string, end: string) => {
    localStorage.setItem('notification_quiet_hours', JSON.stringify({ start, end }));
  }, []);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem('notification_audio_enabled', enabled.toString());
  }, []);

  return {
    playNotificationSound,
    playTestSound,
    setQuietHours,
    setAudioEnabled,
    isQuietHours: isQuietHours(),
    isAudioSupported: !!getAudioContext()
  };
};