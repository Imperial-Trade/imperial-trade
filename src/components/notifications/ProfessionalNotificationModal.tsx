import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Shield, Zap, TrendingUp, Smartphone, CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const { user } = useAuth();
  const { 
    isInitialized, 
    isPushEnabled, 
    isSubscriptionLoading,
    subscribeToPush,
    playerId
  } = useOneSignalPush();

  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingSending, setIsTestingSending] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const showToastMessage = (message: string) => {
    setMessageText(message);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  };

  const handleActivate = async () => {
    setIsSubmitting(true);
    try {
      const success = await subscribeToPush();
      if (success) {
        toast({
          title: "🔔 Alerts Activated!",
          description: "You'll now receive instant trade alerts and market opportunities.",
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
    onClose();
  };

  const sendTestNotification = async () => {
    if (!user || !playerId) {
      toast({
        title: "Test Failed",
        description: "Please activate notifications first to send a test.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
        body: {
          notifications: [{
            signal_id: `test_${Date.now()}`,
            user_id: user.id,
            user_ids: [user.id],
            event_type: 'test_notification',
            title: '🔔 Test Notification',
            message: `Hello ${userName}! Your push notifications are working perfectly.`,
            priority: 'high',
            delivery_channels: ['push', 'in_app'],
            include_creator: true,
            signal_data: {
              type: 'test',
              created_at: new Date().toISOString(),
            },
            metadata: {
              test: true,
              user_name: userName
            }
          }]
        }
      });

      if (error) throw error;

      toast({
        title: "🚀 Test Sent!",
        description: "Check your device for the test notification.",
      });
      
      console.log('✅ Test notification sent:', data);
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      toast({
        title: "Test Failed",
        description: "Unable to send test notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTestingSending(false);
    }
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
              className="pointer-events-auto w-full max-w-md h-auto bg-background rounded-2xl shadow-2xl border border-border animate-pulse shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              style={{ willChange: 'transform' }}
            >
              {/* Header with Crown Logo */}
              <div className="relative bg-gradient-to-br from-imperial-gold via-imperial-gold-light to-imperial-bronze p-8 text-center">

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


                {/* Notification Status */}
                {isPushEnabled && playerId && (
                  <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-accent-green" />
                      <span className="text-sm font-semibold">Push Notifications Active</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Player ID: {playerId.length > 20 ? `${playerId.substring(0, 20)}...` : playerId}
                    </p>
                    <Button
                      onClick={sendTestNotification}
                      disabled={isTestingSending}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {isTestingSending ? (
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>Sending...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="h-3 w-3" />
                          <span>Send Test Notification</span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}

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
                        <span>Notifications Enabled</span>
                      </div>
                    ) : (
                      'Receive Alerts 🔔'
                    )}
                  </Button>

                  <Button
                    onClick={handleNotNow}
                    variant="outline"
                    className="w-full py-3 rounded-full"
                  >
                    No Alerts
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