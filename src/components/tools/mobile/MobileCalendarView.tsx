import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { TradeJournalEntry } from '@/api/client/operations/TradeJournalEntry';

interface MobileCalendarViewProps {
  entries: any[];
  onDateSelect: (date: Date) => void;
  onBack: () => void;
  selectedDate?: Date;
}

export default function MobileCalendarView({ 
  entries, 
  onDateSelect, 
  onBack,
  selectedDate 
}: MobileCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Process entries by date
  const entriesByDate = useMemo(() => {
    const dateMap = new Map<string, any[]>();
    entries.forEach(entry => {
      const dateKey = format(new Date(entry.trade_date), 'yyyy-MM-dd');
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(entry);
    });
    return dateMap;
  }, [entries]);

  // Calculate date range for current view
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    } else {
      // Week view implementation
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayData = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayEntries = entriesByDate.get(dateKey) || [];
    const totalPnL = dayEntries.reduce((sum, entry) => sum + (entry.pnl || 0), 0);
    const winCount = dayEntries.filter(entry => (entry.pnl || 0) > 0).length;
    const lossCount = dayEntries.filter(entry => (entry.pnl || 0) < 0).length;
    
    return {
      entries: dayEntries,
      totalPnL,
      winCount,
      lossCount,
      tradeCount: dayEntries.length
    };
  };

  const renderDayCell = (date: Date) => {
    const dayData = getDayData(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    const isCurrentDay = isToday(date);
    
    return (
      <motion.button
        key={date.toISOString()}
        onClick={() => onDateSelect(date)}
        whileTap={{ scale: 0.95 }}
        className={`
          relative p-1 h-16 w-full text-left border border-border/30 transition-all
          ${isSelected ? 'bg-primary/20 border-primary' : 'hover:bg-muted/50'}
          ${isCurrentDay ? 'ring-2 ring-primary/50' : ''}
          ${dayData.tradeCount > 0 ? 'bg-card' : ''}
        `}
      >
        <div className="flex flex-col h-full">
          <span className={`text-xs font-medium ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
            {format(date, 'd')}
          </span>
          
          {dayData.tradeCount > 0 && (
            <>
              <div className="flex items-center gap-0.5 mt-0.5">
                {dayData.totalPnL > 0 ? (
                  <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                ) : dayData.totalPnL < 0 ? (
                  <TrendingDown className="w-2.5 h-2.5 text-red-500" />
                ) : (
                  <Target className="w-2.5 h-2.5 text-yellow-500" />
                )}
                <span className={`text-[10px] font-bold ${
                  dayData.totalPnL > 0 ? 'text-emerald-500' : 
                  dayData.totalPnL < 0 ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  ${Math.abs(dayData.totalPnL).toFixed(0)}
                </span>
              </div>
              
              <div className="flex gap-0.5 mt-1">
                {dayData.winCount > 0 && (
                  <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                )}
                {dayData.lossCount > 0 && (
                  <div className="w-1 h-1 bg-red-500 rounded-full" />
                )}
              </div>
            </>
          )}
        </div>
      </motion.button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-medium text-muted-foreground text-center p-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(renderDayCell)}
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span>Winning Trade</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Losing Trade</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}