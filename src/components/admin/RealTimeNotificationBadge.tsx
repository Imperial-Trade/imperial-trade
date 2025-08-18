
import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';
import { useRealTimeRequests } from '@/hooks/useRealTimeRequests';
import { motion, AnimatePresence } from 'framer-motion';

interface RealTimeNotificationBadgeProps {
  onNewRequest?: () => void;
}

export const RealTimeNotificationBadge: React.FC<RealTimeNotificationBadgeProps> = ({ 
  onNewRequest 
}) => {
  const { newRequestCount, clearNewRequestCount } = useRealTimeRequests();

  useEffect(() => {
    if (newRequestCount > 0 && onNewRequest) {
      onNewRequest();
    }
  }, [newRequestCount, onNewRequest]);

  const handleClick = () => {
    clearNewRequestCount();
  };

  return (
    <div className="relative inline-block">
      <Bell className="w-5 h-5 text-gray-600" />
      <AnimatePresence>
        {newRequestCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-2 -right-2"
          >
            <Badge 
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs cursor-pointer"
              onClick={handleClick}
            >
              {newRequestCount > 99 ? '99+' : newRequestCount}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
