import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Shield, Zap, TrendingUp, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { toast } from '@/hooks/use-toast';

interface ProfessionalNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const ProfessionalNotificationModal: React.FC<ProfessionalNotificationModalProps> = ({
  isOpen,
  onClose,
  userName = 'Trader'
}) => {
  const { 
    isInitialized, 
    isPushEnabled, 
    isSubscriptionLoading,
    subscribeToPush 
  } = useOneSignalPush();

  const [formState, setFormState] = useState({
    receiveAlerts: false,
    privacyPolicy: false,
    termsOfUse: false,
  });
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const showToastMessage = (message: string) => {
    setMessageText(message);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleCheckboxChange = (field: keyof typeof formState) => {
    setFormState(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formState.receiveAlerts) {
      showToastMessage('Please check "Receive Trade Alerts" to subscribe.');
      return false;
    }
    if (!formState.privacyPolicy) {
      showToastMessage('You must agree to the Privacy Policy.');
      return false;
    }
    if (!formState.termsOfUse) {
      showToastMessage('You must agree to the Terms of Use.');
      return false;
    }
    return true;
  };

  const handleActivate = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        toast({
          title: "🎉 Push Notifications Activated!",
          description: "You'll now receive instant trade alerts and market opportunities.",
        });
        // Reset form and close
        setFormState({
          receiveAlerts: false,
          privacyPolicy: false,
          termsOfUse: false,
        });
        onClose();
      }
    } catch (error) {
      console.error('Activation failed:', error);
      showToastMessage('Activation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotNow = () => {
    showToastMessage('You can enable notifications anytime in your settings.');
    setTimeout(() => onClose(), 1000);
  };

  // Add shake animation after 10 seconds of no interaction
  useEffect(() => {
    if (!isOpen) return;
    
    const shakeTimer = setTimeout(() => {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 1000);
    }, 10000);
    
    return () => clearTimeout(shakeTimer);
  }, [isOpen]);

  if (!isInitialized) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] grid place-items-center p-4 sm:p-6 pointer-events-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                x: shouldShake ? [0, -10, 10, -10, 10, 0] : 0
              }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ 
                type: "spring", 
                duration: 0.45,
                x: { duration: 0.6, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
              }}
              className="pointer-events-auto w-full max-w-md max-h-[min(90dvh,600px)] overflow-y-auto bg-background rounded-2xl shadow-2xl border border-border animate-pulse shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              style={{ willChange: 'transform' }}
            >
              {/* Header with Crown Logo */}
              <div className="relative bg-gradient-to-br from-imperial-gold via-imperial-gold-light to-imperial-bronze p-8 text-center">
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0 text-imperial-white hover:bg-imperial-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Crown Icon with Gradient */}
                <div className="relative mx-auto mb-4">
                  <Crown className="h-16 w-16 mx-auto text-imperial-white drop-shadow-lg" />
                  <div className="absolute inset-0 bg-gradient-to-t from-imperial-gold to-imperial-white opacity-30 rounded-full blur-xl"></div>
                </div>

                <h1 className="text-2xl font-bold text-imperial-white mb-2">
                  Manage Notifications
                </h1>
                <p className="text-imperial-white/90 text-sm">
                  Stay up-to-date with the latest from Trade Imperial.
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Description */}
                <p className="text-muted-foreground text-center">
                  Get instant notifications for price alerts, signal updates, and market opportunities
                </p>

                {/* Benefits List */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Zap className="h-5 w-5 text-accent-gold flex-shrink-0" />
                    <span className="text-sm">Real-time signal notifications</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 text-accent-green flex-shrink-0" />
                    <span className="text-sm">Take profit & stop loss alerts</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-accent-blue flex-shrink-0" />
                    <span className="text-sm">Market updates & analysis</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-feature-purple flex-shrink-0" />
                    <span className="text-sm">Works even when app is closed</span>
                  </div>
                </div>

                {/* Form Checkboxes */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="receive-alerts"
                      checked={formState.receiveAlerts}
                      onCheckedChange={() => handleCheckboxChange('receiveAlerts')}
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor="receive-alerts" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Receive Trade Alerts
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy-policy"
                      checked={formState.privacyPolicy}
                      onCheckedChange={() => handleCheckboxChange('privacyPolicy')}
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor="privacy-policy" 
                      className="text-sm cursor-pointer"
                    >
                      I agree to the{' '}
                      <a 
                        href="/legal/privacy" 
                        target="_blank"
                        className="text-imperial-gold hover:text-imperial-gold-light underline"
                      >
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms-of-use"
                      checked={formState.termsOfUse}
                      onCheckedChange={() => handleCheckboxChange('termsOfUse')}
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor="terms-of-use" 
                      className="text-sm cursor-pointer"
                    >
                      I agree to the{' '}
                      <a 
                        href="/legal/terms" 
                        target="_blank"
                        className="text-imperial-gold hover:text-imperial-gold-light underline"
                      >
                        Terms of Use
                      </a>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={handleActivate}
                    disabled={isSubscriptionLoading || isSubmitting || isPushEnabled}
                    className="w-full bg-gradient-to-r from-imperial-gold to-imperial-bronze hover:from-imperial-gold-light hover:to-imperial-gold text-background font-semibold py-3 rounded-full shadow-lg transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        <span>Activating...</span>
                      </div>
                    ) : isPushEnabled ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Already Activated</span>
                      </div>
                    ) : (
                      'Activate'
                    )}
                  </Button>

                  <Button
                    onClick={handleNotNow}
                    variant="outline"
                    className="w-full py-3 rounded-full"
                  >
                    Not Now
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center justify-center space-x-3 pt-2 border-t border-border">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-3 w-3 text-accent-green" />
                    <span className="text-xs text-muted-foreground">Secure</span>
                  </div>
                  <div className="text-xs text-muted-foreground">•</div>
                  <span className="text-xs text-muted-foreground">No Spam</span>
                  <div className="text-xs text-muted-foreground">•</div>
                  <span className="text-xs text-muted-foreground">Professional</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Message Toast */}
          <AnimatePresence>
            {showMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[102] bg-muted text-muted-foreground px-4 py-3 rounded-xl shadow-xl max-w-sm text-center text-sm"
              >
                {messageText}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};