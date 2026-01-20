import React from 'react';
import { MeccaXXDashboard } from './mecca';

interface GeminiSetupAnalyzerProps {
  className?: string;
  isDarkMode?: boolean;
}

export const GeminiSetupAnalyzer: React.FC<GeminiSetupAnalyzerProps> = ({ className = '' }) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <MeccaXXDashboard />
    </div>
  );
};

export default GeminiSetupAnalyzer;
