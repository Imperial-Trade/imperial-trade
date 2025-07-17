import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Brain, Calendar, BookOpen } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AdvancedTradingJournalProps {
  entries: any[];
}

const AdvancedTradingJournal: React.FC<AdvancedTradingJournalProps> = ({ entries }) => {
  // Generate sample equity curve data
  const generateEquityData = () => {
    const dates = [];
    const values = [];
    let equity = 10000;
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      
      // Simulate equity changes
      const change = (Math.random() - 0.4) * 200;
      equity += change;
      values.push(equity);
    }
    
    return { dates, values };
  };

  const equityData = generateEquityData();

  const chartData = {
    labels: equityData.dates,
    datasets: [
      {
        label: 'Account Equity',
        data: equityData.values,
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  // Generate calendar data
  const generateCalendarData = () => {
    const calendar = [];
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    for (let day = 1; day <= endOfMonth.getDate(); day++) {
      const pnl = Math.random() > 0.5 ? (Math.random() - 0.3) * 500 : 0;
      calendar.push({
        date: day,
        pnl: Math.round(pnl * 100) / 100,
      });
    }
    
    return calendar;
  };

  const calendarData = generateCalendarData();

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                <p className="text-2xl font-bold text-green-600">$2,450.80</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">68.5%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Trade</p>
                <p className="text-2xl font-bold">$45.20</p>
              </div>
              <Brain className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Equity Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Performance Summary</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Your recent performance shows consistent improvement</p>
                <p>• Consider reducing position sizes on high-risk trades</p>
                <p>• Your best performance comes from trend-following strategies</p>
              </div>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">Risk Analysis</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Current risk exposure: Moderate</p>
                <p>• Suggested max position size: 2% per trade</p>
                <p>• Diversification score: 8/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly P&L Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly P&L Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-sm font-medium p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {calendarData.map((day, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-center ${
                  day.pnl > 0 
                    ? 'bg-green-50 border-green-200 text-green-800' 
                    : day.pnl < 0 
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-muted/20 border-border'
                }`}
              >
                <div className="text-sm font-medium">{day.date}</div>
                <div className="text-xs mt-1">
                  {day.pnl !== 0 && `$${day.pnl.toFixed(0)}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Recent Trades Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {entries.slice(-5).map((entry) => (
              <div key={entry.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">{entry.asset_ticker}</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      entry.trade_type === 'Long' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {entry.trade_type}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      entry.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${entry.pnl.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(entry.trade_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                )}
                {entry.ai_positive_feedback && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    <strong>AI Insight:</strong> {entry.ai_positive_feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedTradingJournal;