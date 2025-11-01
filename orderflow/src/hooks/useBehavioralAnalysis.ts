
import { useState, useEffect, useCallback, useRef } from 'react';

interface BehavioralMetrics {
  formLoadTime: number;
  totalTimeOnForm: number;
  fieldInteractionTimes: Record<string, number>;
  mouseMovements: number;
  keystrokes: number;
  focusEvents: number;
  copyPasteEvents: number;
  suspiciousScore: number;
}

interface BehavioralAnalysisResult {
  isLikelyBot: boolean;
  suspiciousScore: number;
  reasons: string[];
}

export const useBehavioralAnalysis = () => {
  const [metrics, setMetrics] = useState<BehavioralMetrics>({
    formLoadTime: Date.now(),
    totalTimeOnForm: 0,
    fieldInteractionTimes: {},
    mouseMovements: 0,
    keystrokes: 0,
    focusEvents: 0,
    copyPasteEvents: 0,
    suspiciousScore: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const currentFieldRef = useRef<string>('');
  const fieldStartTimeRef = useRef<number>(0);

  // Track mouse movements
  const handleMouseMove = useCallback(() => {
    setMetrics(prev => ({ ...prev, mouseMovements: prev.mouseMovements + 1 }));
  }, []);

  // Track keystrokes
  const handleKeyDown = useCallback(() => {
    setMetrics(prev => ({ ...prev, keystrokes: prev.keystrokes + 1 }));
  }, []);

  // Track copy/paste events
  const handlePaste = useCallback(() => {
    setMetrics(prev => ({ ...prev, copyPasteEvents: prev.copyPasteEvents + 1 }));
    console.log('Paste event detected');
  }, []);

  // Track field focus events
  const handleFieldFocus = useCallback((fieldName: string) => {
    const now = Date.now();
    
    // Record time spent on previous field
    if (currentFieldRef.current && fieldStartTimeRef.current) {
      const timeSpent = now - fieldStartTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        fieldInteractionTimes: {
          ...prev.fieldInteractionTimes,
          [currentFieldRef.current]: (prev.fieldInteractionTimes[currentFieldRef.current] || 0) + timeSpent,
        },
        focusEvents: prev.focusEvents + 1,
      }));
    }

    currentFieldRef.current = fieldName;
    fieldStartTimeRef.current = now;
  }, []);

  // Initialize event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('paste', handlePaste);

    // Update total time on form every second
    intervalRef.current = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        totalTimeOnForm: Date.now() - prev.formLoadTime,
      }));
    }, 1000);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('paste', handlePaste);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [handleMouseMove, handleKeyDown, handlePaste]);

  // Calculate behavioral analysis result
  const analyzeeBehavior = useCallback((): BehavioralAnalysisResult => {
    const reasons: string[] = [];
    let suspiciousScore = 0;

    // Check form completion time (too fast = suspicious)
    const minReasonableTime = 30000; // 30 seconds
    if (metrics.totalTimeOnForm < minReasonableTime) {
      suspiciousScore += 30;
      reasons.push('Form completed too quickly');
    }

    // Check mouse movements (no movements = suspicious)
    if (metrics.mouseMovements < 10) {
      suspiciousScore += 25;
      reasons.push('No mouse movement detected');
    }

    // Check excessive copy/paste
    if (metrics.copyPasteEvents > 3) {
      suspiciousScore += 20;
      reasons.push('Excessive copy/paste activity');
    }

    // Check keystroke patterns
    const avgFieldTime = Object.values(metrics.fieldInteractionTimes).reduce((a, b) => a + b, 0) / 
                        Object.keys(metrics.fieldInteractionTimes).length;
    
    if (avgFieldTime < 1000 && Object.keys(metrics.fieldInteractionTimes).length > 0) {
      suspiciousScore += 15;
      reasons.push('Unnatural typing speed');
    }

    // Check focus events (too few = suspicious)
    if (metrics.focusEvents < 3) {
      suspiciousScore += 10;
      reasons.push('Insufficient field interactions');
    }

    return {
      isLikelyBot: suspiciousScore >= 40,
      suspiciousScore,
      reasons,
    };
  }, [metrics]);

  return {
    metrics,
    analyzeeBehavior,
    handleFieldFocus,
  };
};
