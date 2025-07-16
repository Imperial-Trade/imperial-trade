
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';

interface AdminRequestFiltersProps {
  statusFilter: string;
  searchTerm: string;
  resubmissionFilter: string;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (term: string) => void;
  onResubmissionFilterChange: (filter: string) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

export const AdminRequestFilters: React.FC<AdminRequestFiltersProps> = ({
  statusFilter,
  searchTerm,
  resubmissionFilter,
  onStatusFilterChange,
  onSearchChange,
  onResubmissionFilterChange,
  onClearFilters,
  totalCount,
  filteredCount
}) => {
  const hasActiveFilters = statusFilter !== 'all' || searchTerm !== '' || resubmissionFilter !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by email, name, or VT account..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resubmissionFilter} onValueChange={onResubmissionFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="original">Original Only</SelectItem>
              <SelectItem value="resubmitted">Resubmitted Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Showing {filteredCount} of {totalCount} requests
          </span>
          
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Filter className="w-3 h-3 mr-1" />
                Filtered
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-6 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
