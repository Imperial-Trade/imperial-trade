
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SignalStreamLoadingProps {
  stage: 'auth' | 'contexts' | 'data' | 'complete';
  message?: string;
  progress?: number;
}

export const SignalStreamLoading: React.FC<SignalStreamLoadingProps> = ({ 
  stage, 
  message = 'Loading...', 
  progress = 0 
}) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'auth':
        return { 
          title: 'Authenticating...', 
          description: 'Verifying user credentials',
          icon: <Shield className="w-4 h-4" />
        };
      case 'contexts':
        return { 
          title: 'Initializing Services...', 
          description: 'Setting up real-time connections',
          icon: <Wifi className="w-4 h-4" />
        };
      case 'data':
        return { 
          title: 'Loading Signals...', 
          description: 'Fetching latest market data',
          icon: <Loader2 className="w-4 h-4 animate-spin" />
        };
      default:
        return { 
          title: 'Loading...', 
          description: 'Preparing Signal Stream',
          icon: <Loader2 className="w-4 h-4 animate-spin" />
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="min-h-screen bg-background w-full flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            {stageInfo.icon}
            Xeon <span className="text-accent-green">Stream</span>
          </CardTitle>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 mx-auto">
            <Shield className="w-3 h-3 mr-1" />
            Educational Platform
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="font-semibold">{stageInfo.title}</h3>
            <p className="text-sm text-muted-foreground">{stageInfo.description}</p>
            {message && (
              <p className="text-xs text-muted-foreground italic">{message}</p>
            )}
          </div>
          
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-accent-green h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          
          <div className="text-xs text-center text-muted-foreground">
            Please wait while we prepare your trading dashboard...
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
