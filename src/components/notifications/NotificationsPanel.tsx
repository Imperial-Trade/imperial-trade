
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
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </SheetTitle>
          <SheetDescription>Recent alerts and updates</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <NotificationCenter />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;
