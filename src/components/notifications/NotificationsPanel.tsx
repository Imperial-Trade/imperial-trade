
import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { onOpenNotificationCenter } from '@/utils/notificationCenterBus';
import { Bell } from 'lucide-react';

export const NotificationsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const off = onOpenNotificationCenter(() => setOpen(true));
    return off;
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-lg p-0 bg-background/95 backdrop-blur-md border-l border-border/50 shadow-2xl"
      >
        <div className="h-full overflow-hidden">
          <NotificationCenter />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;
