
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AutoDismissToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const showAutoDismissToast = ({ 
  message, 
  type, 
  duration = 5000 
}: AutoDismissToastProps) => {
  const toastConfig = {
    duration,
    className: getToastClassName(type),
  };

  switch (type) {
    case 'success':
      toast.success(message, toastConfig);
      break;
    case 'error':
      toast.error(message, toastConfig);
      break;
    case 'warning':
      toast.warning(message, toastConfig);
      break;
    case 'info':
    default:
      toast.info(message, toastConfig);
      break;
  }
};

const getToastClassName = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'warning':
      return 'bg-orange-50 border-orange-200 text-orange-800';
    case 'info':
    default:
      return 'bg-blue-50 border-blue-200 text-blue-800';
  }
};
