import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGlobalPreviewControl } from '@/contexts/GlobalPreviewControlContext';
import { Crown, Eye, Users } from 'lucide-react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

export const GlobalLeadershipBanner: React.FC = () => {
  const { 
    isGlobalLeader, 
    currentLeader, 
    leaderName, 
    isEnforced, 
    participants,
    requestControl 
  } = useGlobalPreviewControl();

  // Only show when enforcement is enabled and we're not the leader
  if (!isEnforced || isGlobalLeader || !currentLeader) {
    return null;
  }

  return (
    <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
      <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-800 dark:text-yellow-200">
            Live Preview is active by <strong>{leaderName}</strong>
          </span>
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {participants} developers
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Follower Mode
          </Badge>
        </div>
        
        {isDevToolsEnabled() && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={requestControl}
            className="text-xs"
          >
            Request Control
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};