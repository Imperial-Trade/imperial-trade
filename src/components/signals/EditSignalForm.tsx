import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditSignalFormProps {
  alert: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function EditSignalForm({ alert, onSubmit, onCancel }: EditSignalFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    status: alert.status,
    notes: alert.notes || '',
    tp_hits: alert.tpHits || [],
    close_reason: alert.closeReason || null
  });

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Transform data to match UpdateTradeAlertDto
      const updateDto = {
        status: formData.status,
        notes: formData.notes,
        tpHits: formData.tp_hits,
        closeReason: formData.close_reason
      };
      
      console.log('Updating signal with data:', updateDto);
      await onSubmit(updateDto);
      
      toast({
        title: "Signal Updated",
        description: "Your trading signal has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating signal:', error);
      toast({
        title: "Error",
        description: "Failed to update signal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, toast]);

  const handleTpHit = useCallback((tpNumber: number) => {
    setFormData(prev => {
      const newTpHits = prev.tp_hits.includes(tpNumber) 
        ? prev.tp_hits.filter(tp => tp !== tpNumber)
        : [...prev.tp_hits, tpNumber].sort();
      
      return {
        ...prev,
        tp_hits: newTpHits,
        close_reason: newTpHits.length > 0 ? `tp${tpNumber}` : prev.close_reason
      };
    });
  }, []);

  const handleStatusChange = useCallback((newStatus: string) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      close_reason: newStatus === 'closed' && !prev.close_reason ? 'manual' : prev.close_reason
    }));
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Clock },
      closed: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle },
      pending: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock }
    };
    
    const variant = variants[status as keyof typeof variants] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      {/* Signal Info Header */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">{alert.assetName}</h3>
          {getStatusBadge(formData.status)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Symbol</p>
            <p className="text-white font-mono">{alert.tradermadeSymbol}</p>
          </div>
          <div>
            <p className="text-gray-400">Trade Type</p>
            <p className="text-white font-semibold">{alert.tradeType.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-gray-400">Entry Price</p>
            <p className="text-white font-mono">${alert.entryPrice}</p>
          </div>
          <div>
            <p className="text-gray-400">Stop Loss</p>
            <p className="text-red-400 font-mono">${alert.stopLoss}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status Update */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Signal Status</Label>
          <Select value={formData.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Take Profit Management */}
        {(alert.tp1 || alert.tp2 || alert.tp3 || alert.tp4 || alert.tp5) && (
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Take Profit Hits</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(tpNumber => {
                const tpValue = alert[`tp${tpNumber}`];
                if (!tpValue) return null;
                
                const isHit = formData.tp_hits.includes(tpNumber);
                
                return (
                  <Button
                    key={tpNumber}
                    type="button"
                    variant={isHit ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTpHit(tpNumber)}
                    className={
                      isHit 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300"
                    }
                  >
                    {isHit && <CheckCircle className="w-3 h-3 mr-1" />}
                    TP{tpNumber}: ${tpValue}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              Click to mark take profit levels as hit. This will update followers about the signal performance.
            </p>
          </div>
        )}

        {/* Close Reason (if status is closed) */}
        {formData.status === 'closed' && (
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Close Reason</Label>
            <Select 
              value={formData.close_reason || ''} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, close_reason: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-11">
                <SelectValue placeholder="Select close reason..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="manual">Manual Close</SelectItem>
                <SelectItem value="stop_loss">Stop Loss Hit</SelectItem>
                <SelectItem value="tp1">TP1 Reached</SelectItem>
                <SelectItem value="tp2">TP2 Reached</SelectItem>
                <SelectItem value="tp3">TP3 Reached</SelectItem>
                <SelectItem value="tp4">TP4 Reached</SelectItem>
                <SelectItem value="tp5">TP5 Reached</SelectItem>
                <SelectItem value="reversal_after_tp">Reversal After TP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Notes Update */}
        <div className="space-y-3">
          <Label className="text-white text-sm font-medium">Update Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any updates or comments about this signal..."
            className="bg-gray-700 border-gray-600 text-white min-h-[80px] resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-600">
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-accent-green hover:bg-accent-green/80 text-white min-w-[120px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Update Signal'}
          </Button>
        </div>
      </form>
    </div>
  );
}