
import { useMemo, useCallback } from 'react';

interface FilterOptions {
  statusFilter: string;
  searchTerm: string;
  resubmissionFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const useOptimizedFiltering = (
  requests: any[],
  filters: FilterOptions
) => {
  const filteredAndSortedRequests = useMemo(() => {
    if (!requests.length) return [];

    let filtered = [...requests];

    // Apply status filter
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === filters.statusFilter);
    }

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(request =>
        request.email.toLowerCase().includes(term) ||
        request.full_name.toLowerCase().includes(term) ||
        (request.vt_market_account_number && request.vt_market_account_number.toLowerCase().includes(term))
      );
    }

    // Apply resubmission filter
    if (filters.resubmissionFilter !== 'all') {
      if (filters.resubmissionFilter === 'original') {
        filtered = filtered.filter(request => !request.resubmission_count || request.resubmission_count === 0);
      } else if (filters.resubmissionFilter === 'resubmitted') {
        filtered = filtered.filter(request => request.resubmission_count && request.resubmission_count > 0);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[filters.sortBy];
      let bValue = b[filters.sortBy];

      if (filters.sortBy === 'created_at' || filters.sortBy === 'updated_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [requests, filters]);

  const generateStats = useCallback(() => {
    if (!requests.length) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
    }

    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
  }, [requests]);

  return {
    filteredRequests: filteredAndSortedRequests,
    stats: generateStats()
  };
};
