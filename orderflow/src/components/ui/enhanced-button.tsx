import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnhancedButtonProps extends ButtonProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  isLoading = false,
  isSuccess = false,
  loadingText,
  successText,
  successDuration = 2000,
  className,
  disabled,
  onClick,
  ...props
}) => {
  const [showSuccess, setShowSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, successDuration]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isLoading && !showSuccess && onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      {...props}
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        showSuccess && "bg-green-600 hover:bg-green-700",
        isLoading && "cursor-not-allowed",
        className
      )}
      disabled={disabled || isLoading || showSuccess}
      onClick={handleClick}
    >
      <motion.div
        className="flex items-center justify-center gap-2"
        animate={{
          scale: isLoading ? 0.95 : 1,
          opacity: showSuccess ? 0 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-4 h-4" />
          </motion.div>
        )}
        <span>{isLoading ? loadingText || 'Loading...' : children}</span>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: showSuccess ? 1 : 0,
          scale: showSuccess ? 1 : 0.8
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: showSuccess ? 1 : 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
          className="flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          <span>{successText || 'Success!'}</span>
        </motion.div>
      </motion.div>
    </Button>
  );
};