
import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppBar from '@/components/layout/AppBar';

const LandingLayout = () => {
  const location = useLocation();
  const isAccountRequestPage = location.pathname === '/account-request';
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname !== '/signals') return;
    const t = setTimeout(() => {
      const main = document.querySelector<HTMLElement>('[data-scroll-root]');
      const layoutParent = layoutRef.current?.parentElement as HTMLElement | null;
      if (main) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/b0785fe3-7556-4526-8479-f7bc12078fb3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'LandingLayout.tsx', message: 'signals scroll state', data: { pathname: location.pathname, mainScrollHeight: main.scrollHeight, mainClientHeight: main.clientHeight, mainCanScroll: main.scrollHeight > main.clientHeight, layoutRootHeight: layoutRef.current?.offsetHeight ?? null, layoutParentHeight: layoutParent?.offsetHeight ?? null, layoutParentClass: layoutParent?.className ?? null }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
      }
    }, 150);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div ref={layoutRef} className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
      <AppBar />
      <main
        data-scroll-root
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${isAccountRequestPage ? '' : 'pt-20'}`}
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default LandingLayout;
