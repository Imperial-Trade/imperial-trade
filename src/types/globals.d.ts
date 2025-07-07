
/// <reference types="vite/client" />

// Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// Chart.js types for components that might use charts
interface Chart {
  destroy(): void;
  update(): void;
  render(): void;
}

// File API extensions
interface File {
  readonly webkitRelativePath: string;
}

// Crypto API for secure random generation
interface Crypto {
  randomUUID(): string;
}

// Global window extensions
interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
}

// DOM extensions
interface HTMLElement {
  webkitRequestFullscreen?(): Promise<void>;
  mozRequestFullScreen?(): Promise<void>;
  msRequestFullscreen?(): Promise<void>;
}

interface Document {
  webkitExitFullscreen?(): Promise<void>;
  mozCancelFullScreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

// Geolocation API types
interface GeolocationPosition {
  readonly coords: GeolocationCoordinates;
  readonly timestamp: number;
}

interface GeolocationCoordinates {
  readonly accuracy: number;
  readonly altitude: number | null;
  readonly altitudeAccuracy: number | null;
  readonly heading: number | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly speed: number | null;
}

// Notification API
interface NotificationOptions {
  body?: string;
  icon?: string;
  image?: string;
  badge?: string;
  sound?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

declare var Notification: {
  prototype: Notification;
  new(title: string, options?: NotificationOptions): Notification;
  readonly permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
};

type NotificationPermission = "default" | "denied" | "granted";

// IntersectionObserver types
interface IntersectionObserverEntry {
  readonly boundingClientRect: DOMRectReadOnly;
  readonly intersectionRatio: number;
  readonly intersectionRect: DOMRectReadOnly;
  readonly isIntersecting: boolean;
  readonly rootBounds: DOMRectReadOnly | null;
  readonly target: Element;
  readonly time: number;
}

interface IntersectionObserverInit {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

declare var IntersectionObserver: {
  prototype: IntersectionObserver;
  new(callback: IntersectionObserverCallback, options?: IntersectionObserverInit): IntersectionObserver;
};

type IntersectionObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

// Service Worker types
interface ServiceWorkerRegistration {
  readonly active: ServiceWorker | null;
  readonly installing: ServiceWorker | null;
  readonly waiting: ServiceWorker | null;
  readonly scope: string;
  update(): Promise<void>;
  unregister(): Promise<boolean>;
}

// Payment Request API
interface PaymentRequest {
  show(): Promise<PaymentResponse>;
  abort(): Promise<void>;
  canMakePayment(): Promise<boolean>;
}

interface PaymentResponse {
  readonly details: any;
  readonly methodName: string;
  readonly payerEmail: string | null;
  readonly payerName: string | null;
  readonly payerPhone: string | null;
  complete(result?: PaymentComplete): Promise<void>;
}

type PaymentComplete = "fail" | "success" | "unknown";

// Web Workers
interface Worker extends EventTarget {
  postMessage(message: any, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null;
}

declare var Worker: {
  prototype: Worker;
  new(scriptURL: string | URL, options?: WorkerOptions): Worker;
};

interface WorkerOptions {
  type?: WorkerType;
  credentials?: RequestCredentials;
  name?: string;
}

type WorkerType = "classic" | "module";

// IndexedDB enhanced types
interface IDBDatabase extends EventTarget {
  readonly name: string;
  readonly version: number;
  readonly objectStoreNames: DOMStringList;
  close(): void;
  createObjectStore(name: string, optionalParameters?: IDBObjectStoreParameters): IDBObjectStore;
  deleteObjectStore(name: string): void;
  transaction(storeNames: string | string[], mode?: IDBTransactionMode): IDBTransaction;
}

// Custom event types for the application
interface CustomEventMap {
  "user-authenticated": CustomEvent<{ userId: string; email: string }>;
  "trade-alert-created": CustomEvent<{ alertId: string; asset: string }>;
  "notification-received": CustomEvent<{ message: string; type: string }>;
}

declare global {
  interface WindowEventMap extends CustomEventMap {}
}

// Module declarations for assets
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.ico" {
  const content: string;
  export default content;
}

declare module "*.woff" {
  const content: string;
  export default content;
}

declare module "*.woff2" {
  const content: string;
  export default content;
}

// CSS Modules
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
