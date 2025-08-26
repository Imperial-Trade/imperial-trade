
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, className }) => {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="py-10 text-center">
        {Icon && <Icon className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />}
        <h3 className="mt-2 text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};
