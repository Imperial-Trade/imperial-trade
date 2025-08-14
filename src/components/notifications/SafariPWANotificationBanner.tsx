import React, { useState } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOneSignal } from "@/hooks/useOneSignal";
import { toast } from "sonner";

interface SafariPWANotificationBannerProps {
  onClose: () => void;
  className?: string;
}

const SafariPWANotificationBanner: React.FC<SafariPWANotificationBannerProps> = ({ 
  onClose, 
  className = '' 
}) => {
  const { requestPermission } = useOneSignal();
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    
    try {
      const result = await requestPermission();
      
      if (result.success) {
        toast.success("Notifications enabled!", {
          description: "You'll now receive real-time trading signals"
        });
        onClose();
      } else {
        toast.error("Failed to enable notifications", {
          description: "Please try again or check your device settings"
        });
      }
    } catch (error) {
      console.error('Safari PWA permission request error:', error);
      toast.error("Something went wrong", {
        description: "Please try again or restart the app"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto ${className}`}>
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent-gold" />
            <h3 className="font-semibold text-foreground">
              Enable PWA Notifications
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Get instant push notifications for trading signals directly in your installed app.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={handleRequestPermission}
            disabled={isLoading}
            size="sm"
            variant="pwa-primary"
            className="flex-1"
          >
            {isLoading ? 'Enabling...' : 'Subscribe to Notifications'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Skip
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          ✅ This works in your Safari PWA on iOS 16.4+
        </p>
      </div>
    </div>
  );
};

export default SafariPWANotificationBanner;