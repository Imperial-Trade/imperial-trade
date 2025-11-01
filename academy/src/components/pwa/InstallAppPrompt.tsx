import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, X, Smartphone, Zap, Bell, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallAppPromptProps {
  onClose?: () => void;
  showAfterDelay?: boolean;
  delayMs?: number;
}

export const InstallAppPrompt: React.FC<InstallAppPromptProps> = ({
  onClose,
  showAfterDelay = true,
  delayMs = 30000, // 30 seconds default
}) => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true);
      return;
    }

    // Check if user has already dismissed the prompt
    const hasBeenDismissed = localStorage.getItem('install-app-prompt-dismissed');
    if (hasBeenDismissed) return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      if (showAfterDelay) {
        setTimeout(() => {
          setIsVisible(true);
        }, delayMs);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [user, showAfterDelay, delayMs]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsVisible(false);
      } else {
        console.log('User dismissed the install prompt');
        handleClose();
      }
    } catch (error) {
      console.error('Error during app installation:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('install-app-prompt-dismissed', 'true');
    onClose?.();
  };

  // Don't show if no install prompt available, dismissed, installed, or user not authenticated
  if (!deferredPrompt || isDismissed || isInstalled || !user || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="fixed bottom-4 right-4 z-40 max-w-sm"
      >
        <Card className="border-primary/20 bg-background/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Install Imperial Trading
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Get the full app experience
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Benefits */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Smartphone className="h-4 w-4 text-blue-500" />
                <span>Native app experience</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Bell className="h-4 w-4 text-amber-500" />
                <span>Push notifications</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="h-4 w-4 text-purple-500" />
                <span>Faster loading</span>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">
                <Download className="h-3 w-3 inline mr-1" />
                Installs directly from your browser. No app store needed.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1"
                size="sm"
              >
                {isInstalling ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    <span>Installing...</span>
                  </div>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </>
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                size="sm"
              >
                Not Now
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <Download className="h-3 w-3 mr-1" />
                PWA
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Secure
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Fast
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};