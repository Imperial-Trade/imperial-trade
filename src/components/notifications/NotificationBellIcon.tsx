import React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationBellIconProps {
  onClick?: () => void;
  className?: string;
}

export const NotificationBellIcon: React.FC<NotificationBellIconProps> = ({
  onClick,
  className
}) => {
  // TODO: Integrate usePusherBeams hook
  const isEnabled = false; // Temporarily disabled until Pusher Beams is integrated

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(
              "relative transition-all duration-300",
              isEnabled ? "text-primary hover:text-primary/80" : "text-muted-foreground/40 hover:text-muted-foreground/60",
              className
            )}
          >
            {isEnabled ? (
              <div className="relative">
                <Bell className="h-5 w-5 animate-[ring_2s_ease-in-out_infinite]" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            ) : (
              <BellOff className="h-5 w-5 opacity-50" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {isEnabled 
              ? "Notifications enabled - Click to manage" 
              : "Notifications disabled - Click to enable"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

