import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface VersionInfo {
  version: string;
  timestamp: string;
  description: string;
}

export function VersionChecker() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const currentVersion = localStorage.getItem('app_version');
        const response = await fetch('/version.json?t=' + Date.now());
        const versionInfo: VersionInfo = await response.json();
        
        if (currentVersion && currentVersion !== versionInfo.version) {
          setNewVersion(versionInfo);
          setNeedsUpdate(true);
        } else {
          localStorage.setItem('app_version', versionInfo.version);
        }
      } catch (error) {
        console.warn('Version check failed:', error);
      }
    };

    // Check on mount
    checkVersion();
    
    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    if (newVersion) {
      localStorage.setItem('app_version', newVersion.version);
    }
    window.location.reload();
  };

  if (!needsUpdate) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-warning/50 bg-warning/10">
        <RefreshCw className="h-4 w-4" />
        <AlertDescription className="space-y-3">
          <div>
            <strong>Update Available</strong>
            <p className="text-sm mt-1">
              {newVersion?.description || 'A new version is available with important fixes.'}
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            size="sm" 
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Refresh Now
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}