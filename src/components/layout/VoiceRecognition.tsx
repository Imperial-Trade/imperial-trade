import { useState, useEffect } from "react";

interface VoiceRecognitionReturn {
  isListening: boolean;
  recognition: any | null;
  toggleVoiceRecognition: () => void;
}

export const useVoiceRecognition = (): VoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          logger.log("Voice command:", transcript);
          // Handle voice commands here
        };

        recognitionInstance.onerror = () => {
          setIsListening(false);
        };

        recognitionInstance.onend = () => {
          setIsListening(false);
        };

        setRecognition(recognitionInstance);
      }
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return { isListening, recognition, toggleVoiceRecognition };
};
