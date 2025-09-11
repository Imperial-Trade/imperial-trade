
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adminAuditService, AuditLogEntry } from '@/api/services/AdminAuditService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw,
  Shield,
  User,
  Database,
  Settings
} from 'lucide-react';

interface RealtimeAuditLogProps {
  maxEntries?: number;
}

export function RealtimeAuditLog({ maxEntries = 50 }: RealtimeAuditLogProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');

  useEffect(() => {
    loadAuditLogs();
    
    const channelId = `audit-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
    
    // Set up real-time subscription for new audit logs
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('New audit log entry:', payload.new);
          const newEntry = payload.new as AuditLogEntry;
          setAuditLogs(prev => [newEntry, ...prev.slice(0, maxEntries - 1)]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`WS-AUDIT: SUBSCRIBE [${channelId}] name=audit-logs-changes`);
        }
      });

    return () => {
      console.log(`WS-AUDIT: UNSUBSCRIBE [${channelId}]`);
      supabase.removeChannel(channel);
    };
  }, [maxEntries]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const result = await adminAuditService.getAuditLogs(maxEntries);
      
      if (result.success && result.data) {
        setAuditLogs(result.data);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('user')) return <User className="w-4 h-4" />;
    if (action.includes('admin')) return <Shield className="w-4 h-4" />;
    if (action.includes('system')) return <Settings className="w-4 h-4" />;
    if (action.includes('database')) return <Database className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Destructive</Badge>;
    }
    if (action.includes('create') || action.includes('add')) {
      return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Create</Badge>;
    }
    if (action.includes('update') || action.includes('modify')) {
      return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Update</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Read</Badge>;
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_entity.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = !filterAction || log.action.includes(filterAction);
    
    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(auditLogs.map(log => log.action))];

  if (loading) {
    return (
      <Card className="glass-effect border-default">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-green"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Real-time Audit Log
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 ml-2">
              Live
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface border-default text-primary"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-surface border border-default rounded-md text-primary"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <Button
              onClick={loadAuditLogs}
              variant="outline"
              size="sm"
              className="border-default text-secondary hover:bg-surface hover:text-primary"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-primary">Action</TableHead>
                    <TableHead className="text-primary">Admin</TableHead>
                    <TableHead className="text-primary">Target</TableHead>
                    <TableHead className="text-primary">Type</TableHead>
                    <TableHead className="text-primary">Timestamp</TableHead>
                    <TableHead className="text-primary">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className="text-secondary">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-secondary">{log.admin_email}</TableCell>
                      <TableCell className="text-secondary">
                        {log.target_entity}:{log.target_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-secondary">
                        {log.details ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-400 hover:text-blue-300">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-surface/50 p-2 rounded overflow-x-auto">
                              {typeof log.details === 'string' 
                                ? log.details 
                                : JSON.stringify(log.details, null, 2)
                              }
                            </pre>
                          </details>
                        ) : (
                          'No details'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                No Audit Logs
              </h3>
              <p className="text-secondary">
                {searchTerm || filterAction ? 'No logs match your search criteria.' : 'No audit logs found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
