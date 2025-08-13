
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface ErrorDisplayProps {
  error: {
    type: 'not_found' | 'network_error' | 'system_error';
    message: string;
  };
  onRetry: () => void;
  onCheckAnother: () => void;
  isRetrying?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  onCheckAnother, 
  isRetrying = false 
}) => {
  const handleRetry = () => {
    console.log('ErrorDisplay: Retrying request');
    onRetry();
  };

  const handleCheckAnother = () => {
    console.log('ErrorDisplay: Checking another email');
    onCheckAnother();
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network_error':
        return <WifiOff className="w-8 h-8 text-red-400" />;
      case 'system_error':
        return <AlertTriangle className="w-8 h-8 text-red-400" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-red-400" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network_error':
        return 'Connection Issue';
      case 'system_error':
        return 'System Error';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network_error':
        return 'Unable to connect to our servers. Please check your internet connection.';
      case 'system_error':
        return 'Something went wrong on our end. Please try again in a moment.';
      default:
        return 'An unexpected error occurred.';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
            {getErrorIcon()}
          </div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {getErrorTitle()}
        </h3>
        <p className="text-gray-300 mb-2">
          {error.message}
        </p>
        <p className="text-sm text-gray-400">
          {getErrorDescription()}
        </p>
      </div>

      <Card className="glass-effect border-red-500/20 bg-red-500/5">
        <CardContent className="p-4">
          <h4 className="font-medium text-white mb-2">Troubleshooting Tips</h4>
          <ul className="space-y-1 text-sm text-gray-300">
            {error.type === 'network_error' && (
              <>
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                <li>• Disable any VPN or proxy</li>
              </>
            )}
            {error.type === 'system_error' && (
              <>
                <li>• Wait a moment and try again</li>
                <li>• Clear your browser cache</li>
                <li>• Contact support if the issue persists</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
        >
          {isRetrying ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
        
        <Button
          variant="outline"
          className="w-full border-white/20 text-white/80 hover:bg-white/10"
          onClick={handleCheckAnother}
          disabled={isRetrying}
        >
          Check Different Email
        </Button>
      </div>
    </div>
  );
};
