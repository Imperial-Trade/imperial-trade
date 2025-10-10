import React, { useState, useEffect } from 'react';

export default function AdminTools() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeButton, setActiveButton] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth > 768;
      setIsDesktop(desktop);
      
      if (!desktop) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    // Initial setup
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleButtonClick = (index: number) => {
    setActiveButton(index);
  };

  const sidebarItems = [
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
      ),
      text: 'Account Requests'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-2.428M15 19.128L11.63 15.75M15 19.128l-2.074-3.548m-2.074-3.548a3.375 3.375 0 00-5.592 2.55 3.375 3.375 0 00.14 1.052M4.93 15.75l2.074-3.548m0 0a3.375 3.375 0 015.592-2.55 3.375 3.375 0 01-.14 1.052m0 0L11.63 15.75m-6.7-3.548L4.88 8.25m6.75 0l-2.074 3.548"></path>
        </svg>
      ),
      text: 'User Management'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"></path>
        </svg>
      ),
      text: 'Trading Signals'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"></path>
        </svg>
      ),
      text: 'Notifications'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"></path>
        </svg>
      ),
      text: 'System Monitor'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      ),
      text: 'Rate Limits'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"></path>
        </svg>
      ),
      text: 'Diagnostics'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"></path>
        </svg>
      ),
      text: 'Optimization'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V5.25A2.25 2.25 0 0018 3H6A2.25 2.25 0 003.75 5.25v12.75c0 1.242 1.008 2.25 2.25 2.25z"></path>
        </svg>
      ),
      text: 'Monitoring'
    }
  ];

  const bottomItems = [
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995a6.427 6.427 0 010 .255c0 .382.145.755.438.995l1.003.827c.48.398.587 1.096.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.075.124a6.57 6.57 0 01-.22.127c-.331.183-.581.495-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.003-.827c.293-.24.438-.613.438-.995a6.427 6.427 0 010-.255c0-.382-.145-.755-.438-.995l-1.003-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.075-.124.072-.044.146-.087.22-.127.331-.183.581-.495.645-.87l.213-1.281z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      ),
      text: 'Settings'
    },
    { 
      icon: (
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"></path>
        </svg>
      ),
      text: 'Dev Tools'
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0" style={{
        backgroundImage: `
          radial-gradient(at 20% 20%, hsla(273, 56%, 17%, 0.4) 0px, transparent 50%),
          radial-gradient(at 80% 20%, hsla(196, 67%, 15%, 0.5) 0px, transparent 50%),
          radial-gradient(at 20% 80%, hsla(348, 70%, 25%, 0.45) 0px, transparent 50%),
          radial-gradient(at 80% 80%, hsla(220, 77%, 18%, 0.5) 0px, transparent 50%)
        `
      }} />

      {/* Main Content */}
      <main 
        id="admin-main-content"
        className={`
          w-full min-h-screen flex items-center justify-center p-8
          transition-[margin-right] duration-[400ms]
          ${isDesktop ? (isCollapsed ? 'mr-[120px]' : 'mr-[312px]') : 'mr-0'}
        `}
        style={{ transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)' }}
      >
        <div 
          id="admin-dashboard-card"
          className={`
            glass-container rounded-3xl p-8 max-w-4xl w-full text-center
            transition-transform duration-[400ms]
            ${isDesktop && !isCollapsed ? 'scale-95' : 'scale-100'}
          `}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            background: 'rgba(28, 28, 32, 0.6)',
            backdropFilter: 'blur(25px) saturate(150%)',
            WebkitBackdropFilter: 'blur(25px) saturate(150%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
          }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">Dashboard Overview</h1>
          <p className="text-gray-300 text-lg">
            This content area automatically resizes with a smooth animation.
          </p>
          <div className="mt-8 p-6 border border-gray-700 rounded-xl bg-black bg-opacity-20">
            <p className="text-fuchsia-300">
              The sidebar state is: <span className="font-bold">{isCollapsed ? 'Collapsed' : 'Open'}</span>
            </p>
          </div>
        </div>
      </main>

      {/* Sidebar */}
      <aside 
        id="admin-sidebar"
        className={`
          fixed top-0 right-0 h-screen z-50
          transition-[width] duration-[400ms]
          ${isCollapsed ? 'w-[88px]' : 'w-[280px]'}
        `}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
          background: 'rgba(28, 28, 32, 0.6)',
          backdropFilter: 'blur(25px) saturate(150%)',
          WebkitBackdropFilter: 'blur(25px) saturate(150%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
      >
        <nav className="h-full flex flex-col">
          <div className="pt-20 px-2">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-8 h-8 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {!isCollapsed && (
                <h2 className="text-xl font-bold text-gray-200 ml-2">Admin Access</h2>
              )}
            </div>
            {!isCollapsed && <hr className="my-4 border-gray-600" />}
          </div>

          <ul className="space-y-2 flex-grow px-2">
            {sidebarItems.map((item, index) => (
              <li key={index}>
                <button
                  onClick={() => handleButtonClick(index)}
                  className={`
                    sidebar-btn w-full flex items-center rounded-lg text-zinc-400
                    transition-all duration-200
                    ${isCollapsed ? 'justify-center p-3' : 'p-3'}
                    ${activeButton === index 
                      ? 'bg-[rgba(70,70,80,0.7)] text-white' 
                      : 'hover:bg-white/10 hover:text-zinc-50'
                    }
                  `}
                  style={activeButton === index ? {
                    boxShadow: '0 0 15px rgba(192, 132, 252, 0.3)'
                  } : {}}
                >
                  {item.icon}
                  {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.text}</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="p-2">
            {!isCollapsed && <hr className="my-2 border-gray-600" />}
            {bottomItems.map((item, index) => (
              <button
                key={`bottom-${index}`}
                className={`
                  sidebar-btn w-full flex items-center rounded-lg text-zinc-400
                  transition-all duration-200
                  ${isCollapsed ? 'justify-center p-3' : 'p-3'}
                  hover:bg-white/10 hover:text-zinc-50
                `}
              >
                {item.icon}
                {!isCollapsed && <span className="ml-3 whitespace-nowrap">{item.text}</span>}
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Toggle Button */}
      <button
        id="sidebar-toggle"
        onClick={toggleSidebar}
        className="fixed top-8 right-5 z-[100] w-12 h-12 flex items-center justify-center
          rounded-full border border-white/10 cursor-pointer
          transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: 'rgba(30, 30, 35, 0.8)',
          transform: isCollapsed ? 'translateX(12px)' : 'translateX(0)'
        }}
        title="Toggle Sidebar"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(50, 50, 55, 0.9)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(30, 30, 35, 0.8)';
        }}
      >
        {isCollapsed ? (
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.25 4.5l7.5 7.5-7.5 7.5"></path>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 19.5L8.25 12l7.5-7.5"></path>
          </svg>
        )}
      </button>
    </div>
  );
}
