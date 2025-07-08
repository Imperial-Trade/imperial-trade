
import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Info, Briefcase, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppBar: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link to="/" className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
          IMPERIAL
        </span>
      </Link>
      
      <nav className="hidden md:flex items-center gap-6">
        <Link to="/about">
          <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Info className="h-4 w-4" />
            About
          </Button>
        </Link>
        <Link to="/partnership">
          <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Briefcase className="h-4 w-4" />
            IB Partnership
          </Button>
        </Link>
        <Link to="/dashboard/education">
          <Button variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <Star className="h-4 w-4" />
            Features
          </Button>
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <Link to="/access-portal">
          <Button size="sm" className="bg-accent-green hover:bg-green-500 text-white">
            Get Started
          </Button>
        </Link>
      </div>
    </header>
  );
};

export default AppBar;
