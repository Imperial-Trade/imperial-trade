import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

interface FilterState {
  search: string;
  status: string;
  tradeType: string;
  educator: string;
}

interface SignalCounts {
  all: number;
  active: number;
  closed: number;
  pending: number;
  buy: number;
  sell: number;
}

interface EnhancedSignalFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  educatorOptions: Array<{ value: string; label: string }>;
  signalCounts: SignalCounts;
}

export default function EnhancedSignalFilters({
  filters,
  onFiltersChange,
  educatorOptions,
  signalCounts
}: EnhancedSignalFiltersProps) {
  const resetFilters = () => {
    onFiltersChange({
      search: '',
      status: '',
      tradeType: '',
      educator: ''
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search signals..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-8"
            />
          </div>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All ({signalCounts.all})</SelectItem>
              <SelectItem value="active">Active ({signalCounts.active})</SelectItem>
              <SelectItem value="closed">Closed ({signalCounts.closed})</SelectItem>
              <SelectItem value="pending">Pending ({signalCounts.pending})</SelectItem>
            </SelectContent>
          </Select>

          {/* Trade Type Filter */}
          <Select value={filters.tradeType} onValueChange={(value) => onFiltersChange({ ...filters, tradeType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="buy">Buy ({signalCounts.buy})</SelectItem>
              <SelectItem value="sell">Sell ({signalCounts.sell})</SelectItem>
              <SelectItem value="buy_limit">Buy Limit</SelectItem>
              <SelectItem value="sell_limit">Sell Limit</SelectItem>
            </SelectContent>
          </Select>

          {/* Educator Filter */}
          <Select value={filters.educator} onValueChange={(value) => onFiltersChange({ ...filters, educator: value })}>
            <SelectTrigger>
              <SelectValue placeholder="All Educators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Educators</SelectItem>
              {educatorOptions.map((educator) => (
                <SelectItem key={educator.value} value={educator.value}>
                  {educator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={resetFilters}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}