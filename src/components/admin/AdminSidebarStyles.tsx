import React from 'react';

export function AdminSidebarStyles() {
  return (
    <style>{`
      .admin-tools-container {
        background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%);
        position: relative;
        overflow-x: hidden;
      }
      
      .admin-tools-container::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: 
          radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.1) 0%, transparent 50%);
        pointer-events: none;
      }

      .admin-sidebar {
        position: fixed;
        right: 0;
        top: 5rem;
        height: calc(100vh - 5rem);
        background: hsl(var(--muted) / 0.3);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-left: 1px solid hsl(var(--border) / 0.5);
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 40;
        overflow-y: auto;
        overflow-x: hidden;
        box-shadow: -10px 0 40px hsl(var(--background) / 0.4);
        will-change: width;
      }

      .admin-sidebar.expanded {
        width: 280px;
      }

      .admin-sidebar.collapsed {
        width: 88px;
      }

      .admin-content {
        position: relative;
        transition: margin-right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        padding-top: 4rem;
        min-height: calc(100vh - 4rem);
      }

      .admin-content.sidebar-open {
        margin-right: 312px;
      }

      .admin-content.sidebar-closed {
        margin-right: 120px;
      }

      .admin-nav-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        margin: 0.5rem;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 1rem;
        border: 1px solid transparent;
        background: transparent;
        position: relative;
      }

      .admin-nav-item:hover {
        background: hsl(var(--accent) / 0.15);
        border-color: hsl(var(--primary) / 0.3);
        transform: translateX(-4px);
        box-shadow: 0 2px 8px hsl(var(--primary) / 0.1);
      }

      .admin-nav-item.active {
        background: linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--accent) / 0.15) 100%);
        border-color: hsl(var(--primary) / 0.5);
        box-shadow: 0 4px 16px hsl(var(--primary) / 0.25);
      }

      .admin-nav-item.collapsed {
        justify-content: center;
        padding: 0.875rem;
      }

      .admin-nav-item svg {
        transition: all 0.3s ease;
      }

      .admin-nav-item.collapsed:hover svg {
        transform: scale(1.1);
      }
      
      .admin-sidebar.collapsed .admin-nav-item:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        left: -0.5rem;
        transform: translateX(-100%);
        padding: 0.625rem 1rem;
        background: hsl(var(--card) / 0.95);
        backdrop-filter: blur(10px);
        border: 1px solid hsl(var(--border) / 0.5);
        border-radius: 0.5rem;
        white-space: nowrap;
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--foreground));
        z-index: 60;
        box-shadow: 0 4px 16px hsl(var(--background) / 0.4);
        animation: tooltip-fade-in 0.2s ease forwards;
      }

      @keyframes tooltip-fade-in {
        from {
          opacity: 0;
          transform: translateX(-90%);
        }
        to {
          opacity: 1;
          transform: translateX(-100%);
        }
      }

      .glass-card {
        background: hsl(var(--card) / 0.4);
        backdrop-filter: blur(20px);
        border: 1px solid hsl(var(--border) / 0.3);
        border-radius: 1rem;
        box-shadow: 0 8px 32px hsl(var(--background) / 0.3);
      }

      .toggle-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: 1rem;
        margin-bottom: 1rem;
        background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.2));
        backdrop-filter: blur(10px);
        border: 1px solid hsl(var(--primary) / 0.3);
        border-radius: 0.75rem;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .toggle-button:hover {
        background: linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.3));
        border-color: hsl(var(--primary) / 0.5);
        transform: scale(1.02);
        box-shadow: 0 4px 16px hsl(var(--primary) / 0.3);
      }

      .toggle-button.collapsed {
        padding: 0.75rem;
        justify-content: center;
      }
      
      .admin-sidebar.collapsed::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 3px;
        height: 100%;
        background: linear-gradient(180deg, 
          hsl(var(--primary) / 0.8) 0%, 
          hsl(var(--accent) / 0.6) 50%, 
          hsl(var(--primary) / 0.8) 100%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .admin-sidebar.collapsed:hover::before {
        opacity: 1;
      }

      @media (max-width: 768px) {
        .admin-sidebar.expanded {
          width: 240px;
        }
        
        .admin-sidebar.collapsed {
          width: 72px;
        }
        
        .admin-content.sidebar-open {
          margin-right: 256px;
        }
        
        .admin-content.sidebar-closed {
          margin-right: 88px;
        }
        
        .admin-sidebar.collapsed .admin-nav-item:hover::after {
          display: none;
        }
      }

      @media (max-width: 480px) {
        .admin-sidebar.expanded {
          width: 200px;
        }
        
        .admin-content.sidebar-open {
          margin-right: 216px;
        }
      }
    `}</style>
  );
}
