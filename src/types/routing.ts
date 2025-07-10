// Type-safe routing definitions
export interface RouteParams {
  [key: string]: string | undefined;
}

export interface AppRoute {
  path: string;
  component: React.ComponentType<any>;
  title: string;
  description?: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  exact?: boolean;
  meta?: {
    icon?: string;
    badge?: string | number;
    hidden?: boolean;
    order?: number;
  };
}

// Route parameter types for specific routes
export interface DashboardRouteParams extends RouteParams {
  section?: 'home' | 'signals' | 'education' | 'tools' | 'settings' | 'forum' | 'live' | 'admin';
}

export interface SignalRouteParams extends RouteParams {
  signalId?: string;
  action?: 'view' | 'edit' | 'close';
}

export interface UserRouteParams extends RouteParams {
  userId?: string;
  tab?: 'profile' | 'settings' | 'activity';
}

// Navigation state types
export interface NavigationState {
  currentRoute: string;
  previousRoute?: string;
  params: RouteParams;
  query: Record<string, string>;
  isLoading: boolean;
  error?: string;
}

// Route configuration with type safety - Updated to match actual routes
export const ROUTES = {
  // Landing pages
  LANDING: '/',
  ABOUT: '/about',
  FEATURES: '/features',
  SIGNIN: '/signin',
  ACCOUNT_REQUEST: '/account-request',
  ACCESS_PORTAL: '/access-portal',
  
  // Dashboard routes - Standardized to match sidebar navigation
  DASHBOARD: '/dashboard',
  DASHBOARD_HOME: '/dashboard/home',
  DASHBOARD_SIGNALS: '/dashboard/signals',
  DASHBOARD_EDUCATION: '/dashboard/education',
  DASHBOARD_TOOLS: '/dashboard/tools',
  DASHBOARD_SETTINGS: '/dashboard/settings',
  DASHBOARD_FORUM: '/dashboard/forum',
  DASHBOARD_LIVE: '/dashboard/live',
  DASHBOARD_ADMIN: '/dashboard/admin',
  DASHBOARD_PROGRESS: '/dashboard/progress',
  DASHBOARD_ATHENA: '/dashboard/athena-test',
  
  // IB Partnership route - Consolidated to single route
  IB_PARTNERSHIP: '/partnership',
  
  // Signal-specific routes
  SIGNAL_DETAIL: '/dashboard/signals/:signalId',
  SIGNAL_EDIT: '/dashboard/signals/:signalId/edit',
  
  // User routes
  USER_PROFILE: '/user/:userId',
  USER_SETTINGS: '/user/:userId/settings',
  
  // Error routes
  NOT_FOUND: '/404',
  UNAUTHORIZED: '/unauthorized',
  SERVER_ERROR: '/500'
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = typeof ROUTES[RouteKey];

// Type-safe route matching
export function matchRoute(pathname: string, route: string): RouteParams | null {
  const routeParts = route.split('/');
  const pathParts = pathname.split('/');
  
  if (routeParts.length !== pathParts.length) {
    return null;
  }
  
  const params: RouteParams = {};
  
  for (let i = 0; i < routeParts.length; i++) {
    const routePart = routeParts[i];
    const pathPart = pathParts[i];
    
    if (routePart.startsWith(':')) {
      // Dynamic parameter
      const paramName = routePart.slice(1);
      params[paramName] = pathPart;
    } else if (routePart !== pathPart) {
      // Static segment doesn't match
      return null;
    }
  }
  
  return params;
}

// Type-safe route building
export function buildRoute(route: string, params: RouteParams = {}): string {
  let builtRoute = route;
  
  Object.entries(params).forEach(([key, value]) => {
    builtRoute = builtRoute.replace(`:${key}`, value || '');
  });
  
  return builtRoute;
}

// Navigation hook types
export interface UseNavigationReturn {
  navigate: (to: string, options?: { replace?: boolean; state?: any }) => void;
  goBack: () => void;
  goForward: () => void;
  currentRoute: string;
  params: RouteParams;
  query: Record<string, string>;
  isLoading: boolean;
}
