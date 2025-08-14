import React from 'react';
import { X, Smartphone, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstallation } from '@/hooks/usePWAInstallation';
import { motion, AnimatePresence } from 'framer-motion';

interface PWAInstallBannerProps {
  onClose?: () => void;
  className?: string;
}

const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onClose, className = '' }) => {
  const {
    canInstall,
    isIOSDevice,
    isInstalled,
    showIOSInstructions,
    hasInstallPrompt,
    installPWA,
    getIOSInstructions,
    dismissIOSInstructions
  } = usePWAInstallation();

  // Don't show banner if app is already installed
  if (isInstalled || !canInstall) return null;

  const handleInstall = async () => {
    if (isIOSDevice) {
      // For iOS, we can't programmatically trigger install
      // The instructions are already shown
      return;
    }
    
    if (hasInstallPrompt) {
      const success = await installPWA();
      if (success && onClose) {
        onClose();
      }
    }
  };

  const handleClose = () => {
    if (isIOSDevice) {
      dismissIOSInstructions();
    }
    onClose?.();
  };

  const instructions = getIOSInstructions();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto ${className}`}
      >
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">
                {isIOSDevice ? 'Install on iPhone' : 'Install App'}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {isIOSDevice 
              ? 'Install Trade Imperial on your iPhone to receive push notifications and access the app like a native app.'
              : 'Install Trade Imperial for faster access and push notifications.'
            }
          </p>

          {isIOSDevice && showIOSInstructions ? (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-md p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Share className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Installation Steps:</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1 ml-6">
                  {instructions.map((step, index) => (
                    <li key={index} className="list-decimal">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Push notifications only work after installing as an app (iOS 16.4+)
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                size="sm"
                className="flex-1"
                disabled={!hasInstallPrompt && !isIOSDevice}
              >
                <Download className="h-4 w-4 mr-2" />
                {isIOSDevice ? 'Follow Steps Above' : 'Install Now'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
              >
                Later
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallBanner;