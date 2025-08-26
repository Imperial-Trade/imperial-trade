
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Shield, Wifi, Database, User } from 'lucide-react';

interface SignalStreamLoadingProps {
  stage: 'auth' | 'contexts' | 'data' | 'complete';
  message?: string;
  progress?: number;
}

const stageIcons = {
  auth: User,
  contexts: Wifi,
  data: Database,
  complete: Shield
};

const stageMessages = {
  auth: 'Authenticating user...',
  contexts: 'Initializing connections...',
  data: 'Loading signal data...',
  complete: 'Ready!'
};

export const SignalStreamLoading: React.FC<SignalStreamLoadingProps> = ({ 
  stage, 
  message, 
  progress = 0 
}) => {
  const Icon = stageIcons[stage];
  const stageMessage = message || stageMessages[stage];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-accent-green" />
            Xeon Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Icon className="h-12 w-12 text-muted-foreground" />
              <Loader2 className="h-6 w-6 animate-spin absolute -bottom-1 -right-1 text-accent-green" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="font-medium">{stageMessage}</p>
              <p className="text-sm text-muted-foreground">
                Connecting to educational trading signals...
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Loading Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs text-center">
            {Object.entries(stageIcons).map(([key, StageIcon], index) => {
              const isActive = key === stage;
              const isComplete = ['auth', 'contexts', 'data', 'complete'].indexOf(key) < ['auth', 'contexts', 'data', 'complete'].indexOf(stage);
              
              return (
                <div key={key} className={`flex flex-col items-center p-2 rounded ${
                  isActive ? 'bg-accent-green/20 text-accent-green' :
                  isComplete ? 'bg-green-500/20 text-green-600' :
                  'text-muted-foreground'
                }`}>
                  <StageIcon className="h-4 w-4 mb-1" />
                  <span className="capitalize">{key}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
