import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, X } from 'lucide-react';

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
  onClose: () => void;
}

export function ZoomSDKPlayer({ sessionId, meetingNumber, sessionTitle, onClose }: ZoomSDKPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const meetingContainerRef = useRef<HTMLDivElement>(null);
  const initializingRef = useRef(false);

  // Load Zoom SDK
  useEffect(() => {
    const loadZoomSDK = async () => {
      if (window.ZoomMtg || sdkLoaded) return;

      try {
        // Load Zoom Web SDK CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://source.zoom.us/zoom-meeting/2.18.0/css/bootstrap.css';
        document.head.appendChild(cssLink);

        const zoomCssLink = document.createElement('link');
        zoomCssLink.rel = 'stylesheet';
        zoomCssLink.href = 'https://source.zoom.us/zoom-meeting/2.18.0/css/react-select.css';
        document.head.appendChild(zoomCssLink);

        // Load Zoom Web SDK JS
        const script = document.createElement('script');
        script.src = 'https://source.zoom.us/zoom-meeting/2.18.0/lib/vendor/react.min.js';
        script.async = true;

        script.onload = () => {
          const zoomScript = document.createElement('script');
          zoomScript.src = 'https://source.zoom.us/zoom-meeting/2.18.0/lib/vendor/react-dom.min.js';
          zoomScript.async = true;

          zoomScript.onload = () => {
            const sdkScript = document.createElement('script');
            sdkScript.src = 'https://source.zoom.us/zoom-meeting/2.18.0/lib/vendor/redux.min.js';
            sdkScript.async = true;

            sdkScript.onload = () => {
              const zoomMtgScript = document.createElement('script');
              zoomMtgScript.src = 'https://source.zoom.us/zoom-meeting/2.18.0/lib/vendor/lodash.min.js';
              zoomMtgScript.async = true;

              zoomMtgScript.onload = () => {
                const finalScript = document.createElement('script');
                finalScript.src = 'https://source.zoom.us/zoom-meeting/2.18.0/lib/ZoomMtg-2.18.0.min.js';
                finalScript.async = true;

                finalScript.onload = () => {
                  setSdkLoaded(true);
                };

                finalScript.onerror = () => {
                  setError('Failed to load Zoom SDK');
                  setLoading(false);
                };

                document.head.appendChild(finalScript);
              };

              document.head.appendChild(zoomMtgScript);
            };

            document.head.appendChild(sdkScript);
          };

          document.head.appendChild(zoomScript);
        };

        script.onerror = () => {
          setError('Failed to load Zoom SDK dependencies');
          setLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Failed to initialize Zoom SDK');
        setLoading(false);
      }
    };

    loadZoomSDK();
  }, []);

  // Initialize and join meeting
  useEffect(() => {
    const initializeMeeting = async () => {
      if (!sdkLoaded || !window.ZoomMtg || initializingRef.current) return;

      initializingRef.current = true;
      setLoading(true);

      try {
        // Generate JWT token from our edge function
        const { data: jwtData, error: jwtError } = await supabase.functions.invoke('generate-zoom-jwt', {
          body: {
            sessionId,
            meetingNumber,
            role: 0 // Attendee role
          }
        });

        if (jwtError || !jwtData) {
          throw new Error(jwtError?.message || 'Failed to generate meeting token');
        }

        // Set Zoom language
        window.ZoomMtg.setZoomJSLib('https://source.zoom.us/zoom-meeting/2.18.0/lib', '/av');
        window.ZoomMtg.preLoadWasm();
        window.ZoomMtg.prepareJssdk();

        // Initialize Zoom meeting
        window.ZoomMtg.init({
          leaveUrl: window.location.origin + '/dashboard/live',
          isSupportAV: true,
          success: () => {
            console.log('Zoom SDK initialized successfully');
            
            // Join the meeting
            window.ZoomMtg.join({
              signature: jwtData.signature,
              apiKey: jwtData.apiKey,
              meetingNumber: jwtData.meetingNumber,
              userName: jwtData.userName,
              userEmail: jwtData.userEmail,
              passWord: jwtData.passWord,
              tk: '',
              success: (res: any) => {
                console.log('Successfully joined meeting:', res);
                setLoading(false);
                toast.success('Joined meeting successfully');
              },
              error: (res: any) => {
                console.error('Failed to join meeting:', res);
                setError('Failed to join meeting: ' + res.errorMessage);
                setLoading(false);
                toast.error('Failed to join meeting');
              }
            });
          },
          error: (res: any) => {
            console.error('Failed to initialize Zoom SDK:', res);
            setError('Failed to initialize meeting');
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

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Unable to Join Meeting</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
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
              <p className="text-lg font-medium">Joining meeting...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please wait while we connect you to the session
              </p>
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