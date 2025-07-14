import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, X, RefreshCw, ExternalLink } from 'lucide-react';
import { useRetry } from '@/hooks/useRetry';

// Zoom SDK types
declare global {
  interface Window {
    ZoomMtg: any;
  }
}

interface ZoomSDKPlayerProps {
  sessionId: string;
  meetingNumber: string;
  sessionTitle: string;
  zoomMeetingUrl?: string;
  onClose: () => void;
}

export function ZoomSDKPlayer({ sessionId, meetingNumber, sessionTitle, zoomMeetingUrl, onClose }: ZoomSDKPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);

  // Enhanced retry logic for SDK loading
  const sdkRetry = useRetry(
    async () => {
      await loadZoomSDKDependencies();
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`SDK loading retry attempt ${attempt}:`, error);
        setLoadingStep(`Retrying SDK load (${attempt}/3)...`);
        toast.info(`Retrying connection... (${attempt}/3)`);
      }
    }
  );

  // Enhanced SDK loading with better error handling and retry logic
  const loadZoomSDKDependencies = async (): Promise<void> => {
    if (window.ZoomMtg || sdkLoaded) return;

    console.log('Starting Zoom SDK loading process...');
    setLoadingStep('Loading Zoom SDK...');

    // Check network connectivity first
    try {
      setLoadingStep('Checking connectivity...');
      const response = await fetch('https://source.zoom.us/zoom-meeting/latest/lib/ZoomMtg.min.js', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      console.log('Network connectivity check passed');
    } catch (err) {
      console.warn('Network connectivity check failed:', err);
      throw new Error('Network connectivity issue. Please check your internet connection.');
    }

    return new Promise((resolve, reject) => {
      // Use a more reliable single script loading approach
      setLoadingStep('Loading core SDK...');
      
      const sdkScript = document.createElement('script');
      sdkScript.src = 'https://source.zoom.us/zoom-meeting/latest/lib/ZoomMtg.min.js';
      sdkScript.async = true;
      
      // Set timeout for script loading
      const timeout = setTimeout(() => {
        console.error('SDK loading timeout');
        reject(new Error('SDK loading timeout. Please try again.'));
      }, 30000); // 30 second timeout

      sdkScript.onload = () => {
        clearTimeout(timeout);
        console.log('Zoom SDK loaded successfully');
        
        // Verify SDK is actually available
        if (window.ZoomMtg) {
          setLoadingStep('SDK loaded successfully');
          setSdkLoaded(true);
          resolve();
        } else {
          reject(new Error('SDK loaded but ZoomMtg object not available'));
        }
      };

      sdkScript.onerror = (event) => {
        clearTimeout(timeout);
        console.error('Failed to load Zoom SDK:', event);
        reject(new Error('Failed to load Zoom SDK. Please try again or use external Zoom link.'));
      };

      document.head.appendChild(sdkScript);
    });
  };

  // Load SDK with retry logic
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        await sdkRetry.execute();
      } catch (err: any) {
        console.error('All SDK loading attempts failed:', err);
        setError(err.message || 'Failed to load Zoom SDK after multiple attempts');
        setLoading(false);
      }
    };

    initializeSDK();
  }, []);

  // Enhanced meeting initialization with better error handling
  useEffect(() => {
    const initializeMeeting = async () => {
      if (!sdkLoaded || !window.ZoomMtg || initializingRef.current) return;

      initializingRef.current = true;
      setLoading(true);
      setLoadingStep('Generating meeting credentials...');

      try {
        console.log('Generating JWT token for meeting:', meetingNumber);
        
        // Generate JWT token from our edge function
        const { data: jwtData, error: jwtError } = await supabase.functions.invoke('generate-zoom-jwt', {
          body: {
            sessionId,
            meetingNumber,
            role: 0 // Attendee role
          }
        });

        if (jwtError) {
          console.error('JWT generation error:', jwtError);
          throw new Error(`Authentication failed: ${jwtError.message}`);
        }

        if (!jwtData) {
          throw new Error('No credentials received from server');
        }

        console.log('JWT generated successfully, initializing meeting...');
        setLoadingStep('Connecting to meeting...');

        // Enhanced Zoom SDK initialization
        window.ZoomMtg.setZoomJSLib('https://source.zoom.us/zoom-meeting/latest/lib', '/av');
        window.ZoomMtg.preLoadWasm();
        window.ZoomMtg.prepareJssdk();

        // Initialize Zoom meeting with enhanced error handling
        window.ZoomMtg.init({
          leaveUrl: window.location.origin + '/dashboard/live',
          isSupportAV: true,
          isSupportChat: true,
          isSupportQA: true,
          screenShare: true,
          videoHeader: true,
          isShowJoiningErrorDialog: false,
          success: () => {
            console.log('Zoom SDK initialized successfully');
            setLoadingStep('Joining meeting...');
            
            // Join the meeting
            window.ZoomMtg.join({
              signature: jwtData.signature,
              apiKey: jwtData.apiKey,
              meetingNumber: jwtData.meetingNumber,
              userName: jwtData.userName,
              userEmail: jwtData.userEmail,
              passWord: jwtData.passWord || '',
              tk: '',
              success: (res: any) => {
                console.log('Successfully joined meeting:', res);
                setLoading(false);
                setLoadingStep('');
                toast.success('Joined meeting successfully');
              },
              error: (res: any) => {
                console.error('Failed to join meeting:', res);
                const errorMsg = res?.errorMessage || res?.reason || 'Unknown join error';
                setError(`Failed to join meeting: ${errorMsg}`);
                setLoading(false);
                toast.error('Failed to join meeting');
              }
            });
          },
          error: (res: any) => {
            console.error('Failed to initialize Zoom SDK:', res);
            const errorMsg = res?.errorMessage || res?.reason || 'Unknown initialization error';
            setError(`Failed to initialize meeting: ${errorMsg}`);
            setLoading(false);
            toast.error('Failed to initialize meeting');
          }
        });

      } catch (err: any) {
        console.error('Error initializing meeting:', err);
        setError(err.message || 'Failed to join meeting');
        setLoading(false);
        toast.error('Failed to join meeting');
      }
    };

    if (sdkLoaded) {
      initializeMeeting();
    }
  }, [sdkLoaded, sessionId, meetingNumber]);

  const handleLeaveMeeting = () => {
    try {
      if (window.ZoomMtg) {
        window.ZoomMtg.leaveMeeting({
          success: () => {
            console.log('Left meeting successfully');
            onClose();
          },
          error: (res: any) => {
            console.error('Error leaving meeting:', res);
            onClose(); // Close anyway
          }
        });
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error during leave meeting:', err);
      onClose();
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setLoadingStep('Retrying...');
    setSdkLoaded(false);
    initializingRef.current = false;
    sdkRetry.reset();
    
    // Retry SDK loading
    sdkRetry.execute().catch((err: any) => {
      console.error('Retry failed:', err);
      setError(err.message || 'Failed to load Zoom SDK after retry');
      setLoading(false);
    });
  };

  const handleUseExternalZoom = () => {
    if (zoomMeetingUrl) {
      window.open(zoomMeetingUrl, '_blank');
      onClose();
    } else {
      toast.error('External Zoom link not available');
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Unable to Join Meeting</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          
          <div className="space-y-2">
            <Button onClick={handleRetry} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            {zoomMeetingUrl && (
              <Button onClick={handleUseExternalZoom} variant="default" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Zoom App
              </Button>
            )}
            
            <Button onClick={onClose} variant="ghost" className="w-full">
              Close
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Troubleshooting Tips:</strong><br />
              • Check your internet connection<br />
              • Disable browser ad blockers<br />
              • Try refreshing the page<br />
              • Use the "Open in Zoom App" option above
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background border-b">
        <h2 className="text-lg font-semibold">{sessionTitle}</h2>
        <Button 
          onClick={handleLeaveMeeting}
          variant="ghost" 
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-2" />
          Leave Meeting
        </Button>
      </div>

      {/* Meeting Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">{loadingStep}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {sdkRetry.isRetrying ? 
                  `Retrying connection... (${sdkRetry.attempt}/${3})` :
                  'Please wait while we connect you to the session'
                }
              </p>
              
              {zoomMeetingUrl && (
                <Button 
                  onClick={handleUseExternalZoom}
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Use External Zoom Instead
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Zoom SDK will inject meeting UI here */}
        <div 
          ref={meetingContainerRef}
          id="zmmtg-root" 
          className="w-full h-full"
          style={{ minHeight: 'calc(100vh - 80px)' }}
        />
      </div>
    </div>
  );
}