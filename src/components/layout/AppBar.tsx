import React from "react";
import { Link } from "react-router-dom";
import { Crown, Info, Briefcase, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const AppBar: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link to="/" className="flex items-center gap-2">
        <Crown className="h-6 w-6 text-primary" />
        <span className="text-xl imperial-tech-font">IMPERIAL</span>
      </Link>

      <nav className="hidden md:flex items-center gap-6">
        <Link to="/about">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Info className="h-4 w-4" />
            About
          </Button>
        </Link>
        <Link to="/partnership">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Briefcase className="h-4 w-4" />
            IB Partnership
          </Button>
        </Link>
        <Link to="/features">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Star className="h-4 w-4" />
            Features
          </Button>
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <Link to="/features">
          <Button
            size="sm"
            className="bg-accent-green hover:bg-green-500 text-white"
          >
            Get Started
          </Button>
        </Link>
      </div>

      <style>{`
        /* AI Tech Font Styles */
        .imperial-tech-font {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #e6d3b3, #c09a58);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
          position: relative;
        }

        .imperial-tech-font::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
          animation: tech-scan 3s infinite;
          pointer-events: none;
        }

        @keyframes tech-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </header>
  );
};

export default AppBar;
