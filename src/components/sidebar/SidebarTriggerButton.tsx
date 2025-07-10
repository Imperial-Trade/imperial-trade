
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarTriggerButton() {
  const { openMobile, toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="h-8 w-8 text-primary hover:text-primary/80 transition-colors"
    >
      {openMobile ? (
        <X className="h-5 w-5" />
      ) : (
        <Menu className="h-5 w-5" />
      )}
      <span className="sr-only">
        {openMobile ? "Close sidebar" : "Open sidebar"}
      </span>
    </Button>
  );
}
