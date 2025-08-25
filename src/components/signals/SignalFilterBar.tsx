
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  Star,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterState {
  search: string;
  status: string;
  type: string;
  asset: string;
  provider: string;
  performance: string;
  timeframe: string;
}

interface SignalFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  signalCount: {
    total: number;
    active: number;
    pending: number;
    closed: number;
  };
  popularAssets?: string[];
  topProviders?: string[];
}

export const SignalFilterBar: React.FC<SignalFilterBarProps> = ({
  filters,
  onFiltersChange,
  signalCount,
  popularAssets = [],
  topProviders = []
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    
    // Update active filters for display
    const active = Object.entries(newFilters)
      .filter(([k, v]) => v && v !== 'all' && k !== 'search')
      .map(([k]) => k);
    setActiveFilters(active);
  };

  const clearFilter = (key: keyof FilterState) => {
    updateFilter(key, key === 'search' ? '' : 'all');
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      search: '',
      status: 'all',
      type: 'all',
      asset: 'all',
      provider: 'all',
      performance: 'all',
      timeframe: 'all'
    };
    onFiltersChange(clearedFilters);
    setActiveFilters([]);
  };

  const quickFilters = [
    { label: 'Profitable', key: 'performance', value: 'profitable', icon: TrendingUp },
    { label: 'This Week', key: 'timeframe', value: 'week', icon: Clock },
    { label: 'Top Rated', key: 'performance', value: 'top_rated', icon: Star },
    { label: 'High R:R', key: 'performance', value: 'high_rr', icon: Target },
  ];

  return (
    <div className="space-y-4">
      {/* Main Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search signals, assets, or providers..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-black/20 border-gray-700/50 text-white placeholder:text-gray-400 focus:border-accentGreen-light/50"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearFilter('search')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Quick Selects */}
        <div className="flex gap-2">
          <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
            <SelectTrigger className="w-32 bg-black/20 border-gray-700/50 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-gray-700/50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active ({signalCount.active})</SelectItem>
              <SelectItem value="pending">Pending ({signalCount.pending})</SelectItem>
              <SelectItem value="closed">Closed ({signalCount.closed})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
            <SelectTrigger className="w-32 bg-black/20 border-gray-700/50 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-gray-700/50">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="buy_limit">Buy Limit</SelectItem>
              <SelectItem value="sell_limit">Sell Limit</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "border-gray-700/50 text-gray-300 hover:text-white",
              showAdvanced && "bg-accentGreen-light/10 border-accentGreen-light/30 text-accentGreen-light"
            )}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <motion.button
            key={filter.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => updateFilter(filter.key as keyof FilterState, filter.value)}
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all",
              filters[filter.key as keyof FilterState] === filter.value
                ? "bg-accentGreen-light/20 text-accentGreen-light border border-accentGreen-light/30"
                : "bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-gray-600/50"
            )}
          >
            <filter.icon className="w-3 h-3" />
            {filter.label}
          </motion.button>
        ))}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 bg-black/20 rounded-lg border border-gray-700/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={filters.asset} onValueChange={(value) => updateFilter('asset', value)}>
                <SelectTrigger className="bg-black/20 border-gray-700/50 text-white">
                  <SelectValue placeholder="Asset Class" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-gray-700/50">
                  <SelectItem value="all">All Assets</SelectItem>
                  {popularAssets.map((asset) => (
                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.provider} onValueChange={(value) => updateFilter('provider', value)}>
                <SelectTrigger className="bg-black/20 border-gray-700/50 text-white">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-gray-700/50">
                  <SelectItem value="all">All Providers</SelectItem>
                  {topProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.performance} onValueChange={(value) => updateFilter('performance', value)}>
                <SelectTrigger className="bg-black/20 border-gray-700/50 text-white">
                  <SelectValue placeholder="Performance" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-gray-700/50">
                  <SelectItem value="all">All Performance</SelectItem>
                  <SelectItem value="profitable">Profitable Only</SelectItem>
                  <SelectItem value="top_rated">Top Rated</SelectItem>
                  <SelectItem value="high_rr">High Risk:Reward</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-400">Active filters:</span>
          {activeFilters.map((filterKey) => (
            <Badge
              key={filterKey}
              variant="secondary"
              className="bg-accentGreen-light/10 text-accentGreen-light border-accentGreen-light/30 pr-1"
            >
              {filterKey}: {filters[filterKey as keyof FilterState]}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter(filterKey as keyof FilterState)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-gray-400 hover:text-white h-6"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
