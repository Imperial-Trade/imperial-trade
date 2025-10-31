import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Home, Clock, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface JournalSidebarMenuProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'history' | 'analytics' | 'calendar') => void;
}

export function JournalSidebarMenu({ activeTab, onTabChange }: JournalSidebarMenuProps) {
  const [open, setOpen] = useState(false);
  
  const tabs = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'history', icon: Clock, label: 'History' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
  ];

  const handleTabClick = (tabId: 'overview' | 'history' | 'analytics' | 'calendar') => {
    onTabChange(tabId);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-64">
        <div className="flex flex-col gap-2 mt-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-3">Journal Navigation</h3>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id as any)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
