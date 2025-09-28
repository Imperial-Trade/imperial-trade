import { useCallback } from 'react';
import { useNavigation as useNavigationContext } from '@/contexts/NavigationContext';
import { getMainAppUrl, getAcademyAppUrl, getOrderFlowAppUrl } from '@/utils/environment';

export function useAppNavigation() {
  const navigation = useNavigationContext();

  const navigateToApp = useCallback((app: 'main' | 'academy' | 'orderflow', path = '/') => {
    const urls = {
      main: getMainAppUrl(),
      academy: getAcademyAppUrl(),
      orderflow: getOrderFlowAppUrl(),
    };

    const targetUrl = `${urls[app]}${path}`;
    
    navigation.startNavigation(app);
    
    // Add smooth transition
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 200);
  }, [navigation]);

  const isCurrentApp = useCallback((app: string) => {
    return navigation.state.currentApp === app;
  }, [navigation.state.currentApp]);

  return {
    ...navigation,
    navigateToApp,
    isCurrentApp,
    isNavigating: navigation.state.isNavigating,
  };
}