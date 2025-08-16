import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Volume2, 
  VolumeX,
  Smartphone,
  X,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useEnhancedHaptics } from '@/hooks/useEnhancedHaptics';
import { useNotifications } from '@/contexts/NotificationsContext';

interface TradingNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (preferences: NotificationPreferences) => void;
  onDecline: () => void;
}

interface NotificationPreferences {
  critical: boolean; // Stop Loss hits
  important: boolean; // Take Profit hits
  standard: boolean; // New signals
  info: boolean; // Signal updates
  audio: boolean;
  haptic: boolean;
}

const TradingNotificationModal: React.FC<TradingNotificationModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  onDecline
}) => {
  const { triggerSuccess, triggerError, triggerButtonPress } = useEnhancedHaptics();
  const { requestPermission, permission, isIframeBlocked, browserInstructions } = useNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    critical: true,
    important: true,
    standard: true,
    info: false,
    audio: true,
    haptic: true
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);

  // Demo notification sounds
  const playDemoSound = async (type: string) => {
    triggerButtonPress();
    setAudioPlaying(type);
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies: Record<string, number> = {
        critical: 400, // Low urgent tone for SL
        important: 800, // High success tone for TP
        standard: 600, // Neutral tone for signals
        info: 500 // Soft tone for updates
      };

      oscillator.frequency.value = frequencies[type] || 600;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.8);
      
      setTimeout(() => setAudioPlaying(null), 800);
    } catch (error) {
      console.warn('Audio demo failed:', error);
      setAudioPlaying(null);
    }
  };

  const handleAccept = async () => {
    setIsProcessing(true);
    triggerButtonPress();
    
    try {
      // Request OneSignal permission
      const result = await requestPermission();
      
      if (result.success) {
        triggerSuccess();
        onAccept(preferences);
      } else {
        triggerError();
        console.error('Permission request failed:', result.error);
        // Still proceed with in-app notifications
        onAccept(preferences);
      }
    } catch (error) {
      triggerError();
      console.error('Notification setup failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = () => {
    triggerButtonPress();
    onDecline();
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    triggerButtonPress();
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationTypes = [
    {
      key: 'critical' as keyof NotificationPreferences,
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      title: 'Critical Alerts',
      description: 'Stop Loss hits - Immediate action required',
      example: '🚨 EURUSD Stop Loss Hit at 1.0850',
      color: 'border-red-500 bg-red-500/10',
      priority: 'URGENT'
    },
    {
      key: 'important' as keyof NotificationPreferences,
      icon: <Target className="w-5 h-5 text-emerald-400" />,
      title: 'Profit Alerts',
      description: 'Take Profit levels hit - Celebrate your wins',
      example: '🎯 GBPUSD TP1 Hit at 1.2650 (+85 pips)',
      color: 'border-emerald-500 bg-emerald-500/10',
      priority: 'HIGH'
    },
    {
      key: 'standard' as keyof NotificationPreferences,
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      title: 'New Signals',
      description: 'Fresh trading opportunities from Xeon Stream',
      example: '📈 New USDJPY Signal: Buy Limit 148.50',
      color: 'border-blue-500 bg-blue-500/10',
      priority: 'MEDIUM'
    },
    {
      key: 'info' as keyof NotificationPreferences,
      icon: <Bell className="w-5 h-5 text-orange-400" />,
      title: 'Signal Updates',
      description: 'Non-critical updates and modifications',
      example: 'ℹ️ EURUSD signal notes updated',
      color: 'border-orange-500 bg-orange-500/10',
      priority: 'LOW'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-lg"
        >
          <Card className="border-primary/20 bg-background/95 backdrop-blur-md shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold gradient-text">
                Enable Xeon Stream Alerts
              </CardTitle>
              <p className="text-muted-foreground">
                Never miss critical trading opportunities. Get instant notifications for stop loss hits, take profit levels, and new signals directly on your device.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Notification Types */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Alert Categories
                </h3>
                
                {notificationTypes.map((type) => (
                  <div
                    key={type.key}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      preferences[type.key] ? type.color : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">{type.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-sm">{type.title}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {type.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {type.description}
                          </p>
                          <div className="text-xs font-mono bg-background/50 p-2 rounded mt-2">
                            {type.example}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {preferences.audio && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playDemoSound(type.key)}
                            disabled={audioPlaying === type.key}
                            className="p-1 h-auto"
                          >
                            {audioPlaying === type.key ? (
                              <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                            ) : (
                              <VolumeX className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Switch
                          checked={preferences[type.key]}
                          onCheckedChange={() => togglePreference(type.key)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Audio & Haptic Settings */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Experience Settings
                </h3>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Audio Alerts</p>
                      <p className="text-xs text-muted-foreground">
                        Distinct sounds for each alert type
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.audio}
                    onCheckedChange={() => togglePreference('audio')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Haptic Feedback</p>
                      <p className="text-xs text-muted-foreground">
                        Vibration patterns for mobile devices
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.haptic}
                    onCheckedChange={() => togglePreference('haptic')}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isProcessing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Setting up...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Enable Alerts</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Error/Warning Messages */}
              {permission === 'denied' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-red-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Notifications Blocked</span>
                  </div>
                  <p className="text-xs text-red-300 mb-2">
                    Your browser has blocked notifications. To enable alerts:
                  </p>
                  {browserInstructions && (
                    <p className="text-xs text-red-200 font-mono bg-red-500/10 p-2 rounded">
                      {browserInstructions}
                    </p>
                  )}
                </div>
              )}

              {isIframeBlocked && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold text-sm">Embedded Mode Detected</span>
                  </div>
                  <p className="text-xs text-yellow-300">
                    For optimal notification experience, please visit our direct site at{' '}
                    <a 
                      href="https://www.tradeimperial.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-yellow-200"
                    >
                      tradeimperial.com
                    </a>
                  </p>
                </div>
              )}

              {/* Benefits */}
              <div className="text-center text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p>🏆 Professional traders never miss critical alerts</p>
                <p className="mt-1">⚡ Instant delivery • 🔒 Privacy protected • 📱 Works offline</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TradingNotificationModal;