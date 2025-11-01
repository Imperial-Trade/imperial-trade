
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarTriggerButton() {
  const { openMobile, setOpenMobile, toggleSidebar } = useSidebar();

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openMobile) {
        setOpenMobile(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [openMobile, setOpenMobile]);

  const handleClick = () => {
    console.log('Sidebar trigger clicked, current state:', openMobile);
    setOpenMobile(!openMobile);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="h-8 w-8 text-primary hover:text-primary/80 transition-colors relative z-60"
      aria-label={openMobile ? "Close sidebar" : "Open sidebar"}
    >
      <div className="relative">
        <Menu 
          className={`h-5 w-5 transition-all duration-200 ${
            openMobile ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'
          }`} 
        />
        <X 
          className={`h-5 w-5 absolute top-0 left-0 transition-all duration-200 ${
            openMobile ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-0'
          }`} 
        />
      </div>
    </Button>
  );
}
