import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Zap, AlertTriangle, TrendingDown, Clock } from 'lucide-react';
import { neonColors } from './neonTheme';

interface NewsCalendarProps {
  className?: string;
}

// TradingView Economic Calendar – live data from TradingView
const TV_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
const TV_CONFIG = {
  colorTheme: 'dark',
  isTransparent: true,
  width: '100%',
  height: '100%',
  locale: 'en',
  importanceFilter: '0,1,2',
  currencyFilter: 'USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD,CNY',
  countryFilter: 'us,eu,jp,gb,ch,au,ca,nz,cn',
};

const NewsCalendar: React.FC<NewsCalendarProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.cssText = 'height:100%;width:100%;';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.cssText = 'height:100%;width:100%;';
    const script = document.createElement('script');
    script.src = TV_SCRIPT;
    script.async = true;
    script.textContent = JSON.stringify(TV_CONFIG);
    script.onload = () => { setTimeout(() => setIsLoading(false), 1200); };
    script.onerror = () => setIsLoading(false);
    wrap.appendChild(widget);
    wrap.appendChild(script);
    el.appendChild(wrap);
    const fallback = setTimeout(() => setIsLoading(false), 5000);
    return () => { clearTimeout(fallback); if (el) el.innerHTML = ''; };
  }, []);

  const bgImageUrl = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop';

  return (
    <div
      className={`h-full flex flex-col rounded-2xl overflow-hidden relative ${className}`}
      style={{
        border: `1px solid ${neonColors.neonGreen}20`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${bgImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.4 }} />
      <div className="absolute inset-0 z-[1]" style={{ background: 'rgba(10, 15, 13, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
      <div className="px-3 py-2.5 flex items-center justify-between shrink-0 relative z-[2]" style={{ borderBottom: `1px solid ${neonColors.neonGreen}15`, background: 'rgba(0, 0, 0, 0.3)' }}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `linear-gradient(135deg, ${neonColors.neonGreen} 0%, ${neonColors.neonGreenDark} 100%)` }}>
            <Calendar className="w-3.5 h-3.5 text-black" />
          </div>
          <div>
            <h3 className="text-xs font-semibold" style={{ color: neonColors.textPrimary }}>Economic Calendar</h3>
            <p className="text-[9px]" style={{ color: neonColors.textDim }}>Live market events</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5" title="High Impact"><Zap className="w-3 h-3" style={{ color: neonColors.negative }} /></div>
          <div className="flex items-center gap-0.5" title="Medium Impact"><AlertTriangle className="w-3 h-3" style={{ color: '#fbbf24' }} /></div>
          <div className="flex items-center gap-0.5" title="Low Impact"><TrendingDown className="w-3 h-3" style={{ color: neonColors.positive }} /></div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative z-[2]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ background: 'rgba(10, 15, 13, 0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
            <div className="w-10 h-10 rounded-full animate-spin mb-3" style={{ border: `2px solid ${neonColors.borderDefault}`, borderTopColor: neonColors.neonGreen }} />
            <p className="text-xs" style={{ color: neonColors.textMuted }}>Loading calendar...</p>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease', minHeight: 320 }} />
      </div>

      <div className="px-3 py-2 flex items-center justify-between shrink-0 relative z-[2]" style={{ borderTop: `1px solid ${neonColors.neonGreen}15`, background: 'rgba(0, 0, 0, 0.3)' }}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" style={{ color: neonColors.textDim }} />
          <span className="text-[10px] font-mono" style={{ color: neonColors.textMuted }}>Source: TradingView · Live</span>
        </div>
        <a href="https://www.tradingview.com/markets/currencies/economic-calendar/" target="_blank" rel="noopener noreferrer" className="text-[10px] hover:underline" style={{ color: neonColors.neonGreen }}>Full Calendar →</a>
      </div>
    </div>
  );
};

export default NewsCalendar;
