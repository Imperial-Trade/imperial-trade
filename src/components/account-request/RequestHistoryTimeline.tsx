
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, XCircle, Edit, UserCheck } from "lucide-react";
import { AccountRequestData, AccountRequestAudit } from '@/api/entities/AccountRequest';

interface RequestHistoryTimelineProps {
  request: AccountRequestData;
  auditHistory?: AccountRequestAudit[];
}

export const RequestHistoryTimeline: React.FC<RequestHistoryTimelineProps> = ({
  request,
  auditHistory = []
}) => {
  const getStatusIcon = (status: string, changeType: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        if (changeType === 'updated') {
          return <Edit className="w-5 h-5 text-blue-400" />;
        }
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusMessage = (changeType: string, status?: string) => {
    switch (changeType) {
      case 'created':
        return 'Account request submitted';
      case 'approved':
        return 'Request approved';
      case 'rejected':
        return 'Request rejected';
      case 'updated':
        return status === 'pending' ? 'Request updated and resubmitted' : 'Request updated';
      default:
        return 'Status changed';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Create timeline events from audit history and current request
  const timelineEvents = [
    {
      id: 'current',
      date: request.updated_at || request.created_at || new Date().toISOString(),
      type: request.status || 'pending',
      changeType: request.status || 'pending',
      message: getStatusMessage(request.status || 'pending', request.status),
      details: request.status === 'rejected' ? request.rejection_reason : undefined,
      isLatest: true
    },
    ...auditHistory.map(audit => ({
      id: audit.id,
      date: audit.created_at,
      type: audit.change_type,
      changeType: audit.change_type,
      message: getStatusMessage(audit.change_type, (audit.new_values as any)?.status),
      details: audit.notes,
      isLatest: false
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Request History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`p-1 rounded-full ${event.isLatest ? 'bg-accent-green/20' : 'bg-surface/20'}`}>
                  {getStatusIcon(event.type, event.changeType)}
                </div>
                {index < timelineEvents.length - 1 && (
                  <div className="w-px h-8 bg-gray-600 mt-2"></div>
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-medium ${event.isLatest ? 'text-white' : 'text-gray-300'}`}>
                    {event.message}
                  </h4>
                  <span className="text-xs text-gray-400">
                    {formatDate(event.date)}
                  </span>
                </div>
                
                {event.details && (
                  <p className="text-sm text-gray-400 mt-1">
                    {event.details}
                  </p>
                )}
                
                {event.isLatest && request.resubmission_count && request.resubmission_count > 0 && (
                  <div className="text-xs text-blue-400 mt-1">
                    Resubmission #{request.resubmission_count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Email: {request.email}</div>
            <div>Account Type: {request.account_type === 'user' ? 'Standard Member' : 'Educator'}</div>
            <div>Created: {request.created_at ? formatDate(request.created_at) : 'Unknown'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
