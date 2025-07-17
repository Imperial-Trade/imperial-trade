import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  notes: string;
}

const BasicTradingJournal: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'buy' as 'buy' | 'sell',
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePnL = () => {
    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const qty = parseFloat(formData.quantity);
    
    if (!entry || !exit || !qty) return 0;
    
    if (formData.type === 'buy') {
      return (exit - entry) * qty;
    } else {
      return (entry - exit) * qty;
    }
  };

  const addEntry = () => {
    const pnl = calculatePnL();
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: formData.date,
      symbol: formData.symbol.toUpperCase(),
      type: formData.type,
      entryPrice: parseFloat(formData.entryPrice),
      exitPrice: parseFloat(formData.exitPrice),
      quantity: parseFloat(formData.quantity),
      pnl,
      notes: formData.notes
    };

    setEntries(prev => [newEntry, ...prev]);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      symbol: '',
      type: 'buy',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      notes: ''
    });
    setShowForm(false);
  };

  const totalPnL = entries.reduce((sum, entry) => sum + entry.pnl, 0);
  const winRate = entries.length > 0 ? (entries.filter(e => e.pnl > 0).length / entries.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
          Basic Trading Journal
        </h2>
        <p className="text-muted-foreground">
          Simple trade logging and basic performance tracking.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${totalPnL.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Trade Button */}
      <div className="text-center">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-primary to-primary-glow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Trade
        </Button>
      </div>

      {/* Add Trade Form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Log New Trade</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="EURUSD"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="type">Trade Type</Label>
                <Select value={formData.type} onValueChange={(value: 'buy' | 'sell') => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy (Long)</SelectItem>
                    <SelectItem value="sell">Sell (Short)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="1000"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="entryPrice">Entry Price</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  placeholder="1.0850"
                  value={formData.entryPrice}
                  onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="exitPrice">Exit Price</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.00001"
                  placeholder="1.0920"
                  value={formData.exitPrice}
                  onChange={(e) => handleInputChange('exitPrice', e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Trade notes and analysis..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
              />
            </div>
            
            {formData.entryPrice && formData.exitPrice && formData.quantity && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  Calculated P&L: 
                  <span className={`ml-2 font-semibold ${calculatePnL() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${calculatePnL().toFixed(2)}
                  </span>
                </p>
              </div>
            )}
            
            <div className="flex gap-2 mt-6">
              <Button onClick={addEntry} disabled={!formData.symbol || !formData.entryPrice || !formData.exitPrice}>
                Add Trade
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trades List */}
      <div className="space-y-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {entry.type === 'buy' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-semibold">{entry.symbol}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold ${entry.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.pnl >= 0 ? '+' : ''}${entry.pnl.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Entry:</span>
                    <p className="font-medium">{entry.entryPrice}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exit:</span>
                    <p className="font-medium">{entry.exitPrice}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <p className="font-medium">{entry.quantity}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium capitalize">{entry.type}</p>
                  </div>
                </div>
                
                {entry.notes && (
                  <div className="mt-3 p-3 bg-muted/50 rounded text-sm">
                    <p>{entry.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trades Logged Yet</h3>
              <p className="text-muted-foreground">
                Start by adding your first trade to begin tracking your performance
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BasicTradingJournal;