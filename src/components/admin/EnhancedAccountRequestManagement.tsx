
import React, { useState, useEffect } from 'react';
import { AccountRequestManagement } from '@/components/account-request/AccountRequestManagement';
import { AdminAccountRequestStats } from './AdminAccountRequestStats';
import { AdminRequestFilters } from './AdminRequestFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccountRequest } from '@/api/entities';

export const EnhancedAccountRequestManagement: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [resubmissionFilter, setResubmissionFilter] = useState('all');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await AccountRequest.list();
      setRequests(data);
      setFilteredRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [refreshKey]);

  useEffect(() => {
    let filtered = [...requests];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(request =>
        request.email.toLowerCase().includes(term) ||
        request.full_name.toLowerCase().includes(term) ||
        (request.vt_market_account_number && request.vt_market_account_number.toLowerCase().includes(term))
      );
    }

    // Resubmission filter
    if (resubmissionFilter !== 'all') {
      if (resubmissionFilter === 'original') {
        filtered = filtered.filter(request => !request.resubmission_count || request.resubmission_count === 0);
      } else if (resubmissionFilter === 'resubmitted') {
        filtered = filtered.filter(request => request.resubmission_count && request.resubmission_count > 0);
      }
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, searchTerm, resubmissionFilter]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setResubmissionFilter('all');
  };

  const handleExportRequests = () => {
    // Create CSV content
    const headers = ['Email', 'Full Name', 'Status', 'Account Type', 'VT Account', 'Created At', 'Resubmission Count'];
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(request => [
        request.email,
        `"${request.full_name}"`,
        request.status,
        request.account_type,
        request.vt_market_account_number || '',
        new Date(request.created_at).toLocaleDateString(),
        request.resubmission_count || 0
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `account-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Request Management</h2>
          <p className="text-gray-600 mt-1">Review and manage account requests with advanced filtering</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportRequests}
            disabled={filteredRequests.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <AdminAccountRequestStats />

      {/* Filters and Request Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Request Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminRequestFilters
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            resubmissionFilter={resubmissionFilter}
            onStatusFilterChange={setStatusFilter}
            onSearchChange={setSearchTerm}
            onResubmissionFilterChange={setResubmissionFilter}
            onClearFilters={handleClearFilters}
            totalCount={requests.length}
            filteredCount={filteredRequests.length}
          />
          
          <div className="border-t pt-4">
            <AccountRequestManagement 
              onRefresh={handleRefresh}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
