import React from 'react';
import { useLocation } from 'react-router-dom';
import { EconomicRealtimeProvider } from './EconomicRealtimeContext';

interface RouteBasedEconomicProviderProps {
  children: React.ReactNode;
}

// Routes where economic data is actually needed
const ECONOMIC_ROUTES = [
  '/dashboard/signal-stream',
  '/dashboard/advanced-tools',
  '/dashboard/athena',
  '/dashboard/signal-stream'
];

export const RouteBasedEconomicProvider: React.FC<RouteBasedEconomicProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // Check if current route needs economic data
  const needsEconomicData = ECONOMIC_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  console.log(`🌍 RouteBasedEconomicProvider: ${location.pathname} - Economic data ${needsEconomicData ? 'ENABLED' : 'DISABLED'}`);

  return (
    <EconomicRealtimeProvider 
      enabled={needsEconomicData}
      notificationsEnabled={needsEconomicData}
    >
      {children}
    </EconomicRealtimeProvider>
  );
};