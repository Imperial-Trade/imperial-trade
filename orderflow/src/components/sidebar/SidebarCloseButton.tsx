
import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarCloseButton() {
  const { setOpenMobile } = useSidebar();

  const handleClose = () => {
    setOpenMobile(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClose}
      className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors shrink-0"
      aria-label="Close sidebar"
    >
      <X className="h-4 w-4" />
    </Button>
  );
}
