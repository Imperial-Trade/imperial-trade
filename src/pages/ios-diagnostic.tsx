import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  action?: string;
}

export default function IOSDiagnostic() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [playerID, setPlayerID] = useState<string | null>(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const diagnostics: DiagnosticCheck[] = [];

    // Check 1: iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    diagnostics.push({
      name: 'iOS Device',
      status: isIOS ? 'pass' : 'fail',
      message: isIOS ? `Detected: ${navigator.userAgent.split('(')[1]?.split(')')[0] || 'iOS'}` : 'Not an iOS device',
    });

    // Check 2: iOS Version (must be 16.4+)
    if (isIOS) {
      const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
      const version = match ? parseFloat(`${match[1]}.${match[2]}`) : 0;
      const isSupported = version >= 16.4;
      
      diagnostics.push({
        name: 'iOS Version',
        status: isSupported ? 'pass' : 'fail',
        message: isSupported 
          ? `iOS ${version} - Web Push supported ✓`
          : `iOS ${version} - Need iOS 16.4+ for Web Push`,
        action: isSupported ? undefined : 'Update iOS in Settings → General → Software Update',
      });
    }

    // Check 3: PWA Mode
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    diagnostics.push({
      name: 'PWA Installation',
      status: isPWA ? 'pass' : 'fail',
      message: isPWA 
        ? 'Running as installed PWA ✓'
        : 'Not installed as PWA',
      action: isPWA ? undefined : 'Safari → Share (↑) → Add to Home Screen → Open from Home Screen',
    });

    // Check 4: HTTPS
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    diagnostics.push({
      name: 'HTTPS',
      status: isSecure ? 'pass' : 'fail',
      message: isSecure ? 'Secure connection ✓' : 'Must use HTTPS',
    });

    // Check 5: OneSignal SDK
    const isOneSignalLoaded = typeof window.OneSignal !== 'undefined';
    diagnostics.push({
      name: 'OneSignal SDK',
      status: isOneSignalLoaded ? 'pass' : 'fail',
      message: isOneSignalLoaded ? 'SDK loaded ✓' : 'SDK not loaded',
    });

    // Check 6: Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        diagnostics.push({
          name: 'Service Worker',
          status: registration ? 'pass' : 'warning',
          message: registration 
            ? `Registered: ${registration.active?.scriptURL.split('/').pop() || 'Active'}` 
            : 'Not registered',
        });
      } catch (error) {
        diagnostics.push({
          name: 'Service Worker',
          status: 'fail',
          message: 'Error checking service worker',
        });
      }
    }

    // Check 7: Notification Permission
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    diagnostics.push({
      name: 'Notification Permission',
      status: permission === 'granted' ? 'pass' : permission === 'denied' ? 'fail' : 'warning',
      message: permission === 'granted' 
        ? 'Granted ✓' 
        : permission === 'denied' 
        ? 'Denied - Reset in iOS Settings' 
        : 'Not requested yet',
      action: permission === 'denied' && isIOS 
        ? 'iOS Settings → Trade Imperial → Notifications → Allow Notifications' 
        : undefined,
    });

    // Check 8: OneSignal Player ID
    if (isOneSignalLoaded && window.OneSignal) {
      try {
        await window.OneSignal.init({ appId: "3ea69bee-8061-4dd7-8053-fc95779b0f1e" });
        const playerId = await window.OneSignal.User.PushSubscription.id;
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
        
        setPlayerID(playerId);
        
        diagnostics.push({
          name: 'OneSignal Subscription',
          status: playerId && isSubscribed ? 'pass' : 'warning',
          message: playerId && isSubscribed
            ? `Subscribed - Player ID: ${playerId.substring(0, 8)}...`
            : 'Not subscribed',
        });
      } catch (error: any) {
        diagnostics.push({
          name: 'OneSignal Subscription',
          status: 'fail',
          message: `Error: ${error.message}`,
        });
      }
    }

    setChecks(diagnostics);
  };

  const copyPlayerID = () => {
    if (playerID) {
      navigator.clipboard.writeText(playerID);
      toast({
        title: 'Copied!',
        description: 'Player ID copied to clipboard',
      });
    }
  };

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const allPassed = checks.every(c => c.status === 'pass');
  const hasCriticalFailures = checks.some(c => c.status === 'fail');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">🍎 iOS Push Notification Diagnostic</h1>
          <p className="text-muted-foreground">
            Verify your device meets all requirements for iOS Web Push notifications.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{check.name}</div>
                  <div className="text-sm text-muted-foreground">{check.message}</div>
                  {check.action && (
                    <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                      ➜ {check.action}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {playerID && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">OneSignal Player ID</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">{playerID}</div>
                </div>
                <Button variant="outline" size="sm" onClick={copyPlayerID}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                {allPassed && (
                  <div className="text-green-600 dark:text-green-400 font-semibold">
                    ✅ All checks passed! iOS push notifications should work.
                  </div>
                )}
                {hasCriticalFailures && (
                  <div className="text-red-600 dark:text-red-400 font-semibold">
                    ❌ Critical issues detected. Fix the failures above.
                  </div>
                )}
                {!allPassed && !hasCriticalFailures && (
                  <div className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    ⚠️ Some issues detected. Review warnings above.
                  </div>
                )}
              </div>
              <Button onClick={runDiagnostics}>
                Run Again
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold mb-4">📱 iOS Installation Instructions</h2>
          <ol className="space-y-2 text-sm">
            <li>1. Open <strong>Safari</strong> (not Chrome or any other browser)</li>
            <li>2. Go to <strong>https://tradeimperial.com</strong></li>
            <li>3. Tap the <strong>Share button</strong> (↑ at the bottom)</li>
            <li>4. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
            <li>5. Tap <strong>"Add"</strong> in the top-right corner</li>
            <li>6. <strong>Close Safari completely</strong></li>
            <li>7. Open <strong>Trade Imperial from your home screen</strong> (the icon you just added)</li>
            <li>8. When prompted, tap <strong>"Allow"</strong> for notifications</li>
          </ol>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">🔍 Quick Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">Minimum Requirements:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>iOS 16.4 or later</li>
                <li>Safari browser</li>
                <li>Installed as PWA (Add to Home Screen)</li>
                <li>HTTPS connection</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold">Common Issues:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Testing in Safari browser instead of PWA</li>
                <li>Using Chrome/Firefox on iOS</li>
                <li>iOS version older than 16.4</li>
                <li>Notifications disabled in iOS Settings</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

