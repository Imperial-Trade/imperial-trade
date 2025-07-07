
// Global type definitions for the Imperial Trading application

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  AudioContext: typeof AudioContext;
  webkitAudioContext: typeof AudioContext;
  addNotification?: (notification: {
    type: string;
    title: string;
    message: string;
  }) => void;
}

// Speech Recognition API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

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

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

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
