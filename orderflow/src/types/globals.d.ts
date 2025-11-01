
// Global type definitions for the Imperial Trading application

interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
  AudioContext: typeof AudioContext;
  webkitAudioContext: typeof AudioContext;
  addNotification?: (notification: {
    type: string;
    title: string;
    message: string;
  }) => void;
}

// Speech Recognition API types
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Navigation item types
interface NavigationItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  accessLevel: string;
  adminOnly?: boolean;
}

// Scroll reveal animation types
interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
}

// User access levels
type AccessLevel = 'free' | 'user' | 'verified' | 'admin';

// Common component props
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Animation component props
interface AnimatedComponentProps extends BaseComponentProps {
  style?: React.CSSProperties;
}

export {};
