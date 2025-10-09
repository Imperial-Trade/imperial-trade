import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileAdminCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  icon?: React.ReactNode;
}

export const MobileAdminCard: React.FC<MobileAdminCardProps> = ({
  title,
  children,
  className,
  headerAction,
  icon
}) => {
  return (
    <Card className={cn("glass-effect border-border/50", className)}>
      {title && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          {headerAction}
        </CardHeader>
      )}
      <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
        {children}
      </CardContent>
    </Card>
  );
};
