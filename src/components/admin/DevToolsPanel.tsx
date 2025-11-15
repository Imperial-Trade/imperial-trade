import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  RefreshCw, 
  Database, 
  Settings, 
  Info,
  Trash2,
  Monitor,
  Clock
} from 'lucide-react';
import { getBuildInfo, isDevToolsEnabled } from '@/utils/featureFlags';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const DevToolsPanel: React.FC = () => {
  const buildInfo = getBuildInfo();
  const queryClient = useQueryClient();

  const handleResetDevState = () => {
    try {
      // ⚠️ PROTECTED KEYS - DO NOT DELETE!
      const PROTECTED_KEYS = [
        'imperial-trade-notifications', // Recent Activity notifications MUST persist
      ];
      
      // Clear localStorage (except protected keys)
      console.log('🧹 Clearing localStorage (protecting important data)...');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !PROTECTED_KEYS.includes(key)) {
          keysToRemove.push(key);
        } else if (key) {
          console.log(`🔒 [PROTECTED] Keeping localStorage key: ${key}`);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🧹 Removed localStorage key: ${key}`);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear React Query cache
      queryClient.clear();
      
      // Clear any cached service worker data
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }

      // Clear IndexedDB (best effort)
      if ('indexedDB' in window) {
        try {
          // Try to get database names (modern browsers)
          if (indexedDB.databases) {
            indexedDB.databases().then(databases => {
              databases.forEach(db => {
                if (db.name) {
                  indexedDB.deleteDatabase(db.name);
                }
              });
            }).catch(() => {
              // Fallback: try common database names
              ['localforage', 'keyval-store', 'firestore', 'supabase'].forEach(dbName => {
                try {
                  indexedDB.deleteDatabase(dbName);
                } catch (e) {
                  // Ignore errors for non-existent databases
                }
              });
            });
          }
        } catch (error) {
          console.warn('Could not clear IndexedDB:', error);
        }
      }
      
      toast.success('Developer state cleared successfully');
      
      // Reload after a brief delay to ensure all cleanup is complete
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error clearing dev state:', error);
      toast.error('Failed to clear developer state');
    }
  };

  const handleClearCache = () => {
    try {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      toast.success('Browser cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Failed to clear cache');
    }
  };

  if (!isDevToolsEnabled()) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Developer Tools Disabled</h3>
          <p className="text-muted-foreground mb-4">
            Set <code>VITE_SHOW_DEV_TOOLS=true</code> in your environment to enable developer tools.
          </p>
          <Badge variant="secondary">Feature Flag: VITE_SHOW_DEV_TOOLS</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Build Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Build Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment:</span>
              <Badge variant={buildInfo.isDevelopment ? 'default' : 'secondary'}>
                {buildInfo.environment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-mono">{buildInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dev Tools:</span>
              <Badge variant={buildInfo.devToolsEnabled ? 'default' : 'secondary'}>
                {buildInfo.devToolsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build Time:</span>
              <span className="font-mono text-xs">
                {import.meta.env.VITE_BUILD_TIMESTAMP 
                  ? new Date(import.meta.env.VITE_BUILD_TIMESTAMP).toLocaleString()
                  : new Date(buildInfo.buildDate).toLocaleString()
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build SHA:</span>
              <span className="font-mono text-xs">
                {import.meta.env.VITE_BUILD_SHA?.slice(0, 7) || 'dev'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Node Env:</span>
              <Badge variant="outline">
                {import.meta.env.MODE}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Developer Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset Dev State
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Developer State</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear most localStorage (except notifications), sessionStorage, browser caches, and IndexedDB data, then reload the page. 
                    Your Recent Activity notifications will be preserved. This action will log you out.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetDevState} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Reset Dev State
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button
              onClick={handleClearCache}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Clear Cache
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Force Reload
            </Button>
            
            <Button
              onClick={() => window.open('/dashboard/admin', '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Monitor className="w-4 h-4" />
              Open Admin
            </Button>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <strong>Reset Dev State:</strong> Clears all local storage, session storage, and caches, then reloads the page.
            </p>
            <p>
              <strong>Clear Cache:</strong> Removes browser cache data without affecting user data.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">localStorage:</span>
              <Badge variant="outline">
                {localStorage.length} items
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">sessionStorage:</span>
              <Badge variant="outline">
                {sessionStorage.length} items
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User Agent:</span>
              <span className="font-mono text-xs truncate max-w-32" title={navigator.userAgent}>
                {navigator.userAgent.split(' ')[0]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Online:</span>
              <Badge variant={navigator.onLine ? 'default' : 'destructive'}>
                {navigator.onLine ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};