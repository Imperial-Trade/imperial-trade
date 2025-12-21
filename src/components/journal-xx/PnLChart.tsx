import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Brush, CartesianGrid } from 'recharts';
import { TradeEntry } from './types';

interface PnLChartProps {
  data: TradeEntry[];
  isDarkMode: boolean;
}

export const PnLChart: React.FC<PnLChartProps> = ({ data, isDarkMode }) => {
  // Show placeholder graph with straight line when no data
  if (data.length === 0) {
    const placeholderData = [
      { name: '', total: 0 },
      { name: '', total: 0 },
      { name: '', total: 0 },
      { name: '', total: 0 },
      { name: '', total: 0 },
      { name: '', total: 0 },
    ];

    const strokeColor = isDarkMode ? '#CD7F32' : '#EAB308';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDarkMode ? '#71717a' : '#78716c';
    const zeroLineColor = isDarkMode ? '#27272a' : '#e7e5e4';

    return (
      <div className="h-64 w-full mt-6 select-none" style={{ outline: 'none', minHeight: '256px' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={256}>
          <AreaChart 
            data={placeholderData} 
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={gridColor} 
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={false}
              hide={true}
            />
            <YAxis 
              hide={false}
              domain={[-500, 500]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: textColor }}
              tickFormatter={(value) => `$${value}`}
              width={50}
            />
            <ReferenceLine y={0} stroke={zeroLineColor} strokeDasharray="3 3" strokeWidth={1.5} />
            <Area 
              type="linear" 
              dataKey="total" 
              stroke={strokeColor} 
              strokeWidth={2.5}
              fillOpacity={0} 
              fill="none"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Sort chronologically (Oldest first)
  const chronologicalData = data.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate cumulative PnL points
  let cumulative = 0;
  const tradePoints = chronologicalData.map((trade) => {
    cumulative += trade.pnl;
    return {
      date: trade.date,
      name: new Date(trade.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      pnl: trade.pnl,
      total: cumulative,
      asset: trade.asset,
      notes: trade.notes,
      id: trade.id
    };
  });

  // Create a zero-start point
  const startPoint = {
    date: chronologicalData[0].date, 
    name: 'Start',
    pnl: 0,
    total: 0,
    asset: 'Account Start',
    notes: 'Initial Balance: $0.00',
    id: 'start-node'
  };

  const chartData = [startPoint, ...tradePoints];

  const strokeColor = isDarkMode ? '#CD7F32' : '#EAB308'; // bronze-500 : yellow-500
  const brushFill = isDarkMode ? "#27272a" : "#e7e5e4";
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;

      if (d.id === 'start-node') {
          return (
            <div className={`p-3 rounded-xl border shadow-xl backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-slate-900/90 border-bronze-500/30 text-slate-200' 
                  : 'bg-white/90 border-yellow-500/30 text-stone-800'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">Account Start</span>
                <div className="text-xl font-black font-mono mt-1">$0.00</div>
            </div>
          );
      }

      return (
        <div className={`p-3 rounded-xl border shadow-xl backdrop-blur-md ${
          isDarkMode 
            ? 'bg-slate-900/90 border-bronze-500/30 text-slate-200' 
            : 'bg-white/90 border-yellow-500/30 text-stone-800'
        }`}>
          <div className="flex justify-between items-center mb-2 gap-4">
             <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{label}</span>
             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                 d.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
             }`}>
                {(d.pnl >= 0 ? '+' : '-') + '$' + Math.abs(d.pnl).toFixed(2)}
             </span>
          </div>
          
          <div className="flex items-baseline gap-2 mb-1">
             <span className="text-sm font-bold text-stone-500 dark:text-slate-400">{d.asset}</span>
             <span className={`text-xl font-black font-mono ${
                 d.total >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
             }`}>
                {(d.total >= 0 ? '+' : '-') + '$' + Math.abs(d.total).toFixed(2)}
             </span>
          </div>
          
          {d.notes && (
            <div className="mt-2 pt-2 border-t border-dashed border-stone-200 dark:border-slate-700">
                <p className="text-[10px] leading-relaxed opacity-70 italic line-clamp-2 max-w-[180px]">
                    "{d.notes}"
                </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom traveller to replace default blue handle
  const CustomTraveller = (props: any) => {
      const { x, y, width, height } = props;
      return (
        <path 
          d={`M${x},${y} h${width} v${height} h-${width} Z`} 
          fill={strokeColor} 
          stroke="none"
          opacity={0.8}
        />
      );
  };

  return (
    <div className="h-64 w-full mt-6 select-none" style={{ outline: 'none', minHeight: '256px' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={256}>
        <AreaChart 
            data={chartData} 
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} 
          />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: isDarkMode ? '#71717a' : '#78716c', dy: 10 }} 
            minTickGap={30}
          />
          <YAxis hide domain={['auto', 'auto']} />
          
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 4' }} 
          />
          
          <ReferenceLine y={0} stroke={isDarkMode ? "#27272a" : "#e7e5e4"} strokeDasharray="3 3" />
          
          <Area 
            type="natural" 
            dataKey="total" 
            stroke={strokeColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorTotal)" 
            activeDot={{ 
                r: 6, 
                stroke: isDarkMode ? '#09090b' : '#ffffff', 
                strokeWidth: 3, 
                fill: strokeColor
            }}
            animationDuration={1500}
          />
          
          <Brush 
            dataKey="name" 
            height={12} 
            stroke={strokeColor}
            fill={brushFill}
            fillOpacity={0.2}
            tickFormatter={() => ''} 
            travellerWidth={6}
            traveller={CustomTraveller}
            alwaysShowText={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
