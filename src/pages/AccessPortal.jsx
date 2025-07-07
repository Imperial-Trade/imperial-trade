
import React from 'react';
import { Crown, UserPlus } from 'lucide-react';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';


export default function AccessPortal() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Video with Multiple Sources */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        style={{ filter: 'brightness(0.4)' }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
        <source
          src="https://videos.pexels.com/video-files/4968631/4968631-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
        <source
          src="https://videos.pexels.com/video-files/4968357/4968357-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>
      
      {/* Fallback Background if Video Fails */}
      <div 
        className="absolute inset-0 z-0 bg-gradient-to-br from-gray-900 via-blue-900 to-green-900"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)
          `
        }}
      ></div>
      
      {/* Animated Chart Lines Overlay */}
      <div className="absolute inset-0 z-5 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path 
            d="M0,400 Q250,200 500,300 T1000,100" 
            stroke="rgba(16, 185, 129, 0.8)" 
            strokeWidth="2" 
            fill="none"
            className="animate-pulse"
          />
          <path 
            d="M0,500 Q200,350 400,400 T800,250 L1000,300" 
            stroke="rgba(59, 130, 246, 0.6)" 
            strokeWidth="1.5" 
            fill="none"
            style={{ animationDelay: '1s' }}
            className="animate-pulse"
          />
          <path 
            d="M0,300 Q300,450 600,200 T1000,400" 
            stroke="rgba(139, 92, 246, 0.4)" 
            strokeWidth="1" 
            fill="none"
            style={{ animationDelay: '2s' }}
            className="animate-pulse"
          />
        </svg>
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10"></div>

      {/* Content */}
      <div className="relative z-20 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-surface/90 rounded-2xl flex items-center justify-center glow-effect-gold backdrop-blur-md shadow-2xl">
              <Crown className="w-10 h-10 text-accent-gold" />
            </div>
            <div>
              <h1 className="text-4xl font-bold imperial-tech-font drop-shadow-lg">IMPERIAL</h1>
              <p className="text-lg text-white/90 drop-shadow-md">Trading Community</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-600">Sign in or create your account</p>
          </div>

          {/* SocialLoginButtons component is expected to handle Google Login */}
          <SocialLoginButtons />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Login Issues?</span>
            </div>
          </div>

          <Link to={createPageUrl('AccountRequest')}>
            <Button variant="outline" className="w-full text-primary border-primary/20 hover:bg-primary/5">
                <UserPlus className="w-4 h-4 mr-2" />
                Request Manual Account Setup
            </Button>
          </Link>
        </div>
        
        <div className="text-center mt-6">
          <p className="text-sm text-white/80 bg-black/30 rounded-full px-4 py-1 inline-block backdrop-blur-sm">
            New to trading? We'll guide you every step of the way.
          </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-green-500/10 rounded-full blur-xl animate-pulse z-5"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse z-5" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-pulse z-5" style={{ animationDelay: '3s' }}></div>
      
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
    </div>
  );
}
