
// Global type definitions
declare global {
  interface Window {
    Chart?: any;
    webkitAudioContext?: typeof AudioContext;
    addNotification?: (notification: {
      type: string;
      title: string;
      message: string;
    }) => void;
  }
}

export {};
