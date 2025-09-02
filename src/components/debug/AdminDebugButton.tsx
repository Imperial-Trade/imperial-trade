import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';
import { PriceDebugWidget } from './PriceDebugWidget';

export const AdminDebugButton: React.FC = () => {
  const { profile, user } = useAuth();
  const [showDebugWidget, setShowDebugWidget] = useState(false);
  
  // Admin-only access
  const isAdmin = profile?.access_level === 'admin' || user?.user_metadata?.access_level === 'admin';
  
  if (!isAdmin) return null;
  
  return (
    <>
      <Button
        onClick={() => setShowDebugWidget(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur"
      >
        <Settings className="h-4 w-4 mr-2" />
        Debug
      </Button>
      
      {showDebugWidget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-auto">
            <Button
              onClick={() => setShowDebugWidget(false)}
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 z-10"
            >
              Close
            </Button>
            <PriceDebugWidget />
          </div>
        </div>
      )}
    </>
  );
};