import React, { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TradeAlertWithProfile } from '@/types/trading';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useToast } from '@/hooks/use-toast';
import { useOrderManagement } from '@/hooks/useOrderManagement';

interface EnhancedSignalCardProps {
  signal: TradeAlertWithProfile;
  showAllSignals: boolean;
}

const EnhancedSignalCard = memo(({ signal, showAllSignals }: EnhancedSignalCardProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updateAlert } = useOrderManagement();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(async (closeReason: TradeAlertWithProfile['closeReason']) => {
    setIsClosing(true);
    try {
      if (!signal.id) {
        throw new Error('Signal ID is missing');
      }

      const updatedSignal = await updateAlert(signal.id, {
        status: 'closed',
        closeReason: closeReason,
      });

      if (!updatedSignal) {
        toast({
          variant: 'destructive',
          title: 'Failed to close signal',
          description: 'Please try again.',
        });
      } else {
        toast({
          title: 'Signal closed',
          description: `Signal ${signal.assetName} closed with reason: ${closeReason}`,
        });
      }
    } catch (error: any) {
      console.error('Error closing signal:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to close signal',
        description: error.message || 'Please try again.',
      });
    } finally {
      setIsClosing(false);
    }
  }, [signal, updateAlert, toast]);

  const handleViewDetails = useCallback(() => {
    navigate(createPageUrl(`/dashboard/signals/${signal.id}`));
  }, [signal, navigate]);

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarImage src={signal.creator?.avatar_url || `https://avatar.vercel.sh/${signal.creator?.display_name}.png`} />
            <AvatarFallback>{signal.creator?.display_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">{signal.assetName}</h3>
            {!showAllSignals && (
              <p className="text-xs text-muted-foreground">
                {signal.creator?.display_name || 'Unknown User'}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open dropdown menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleViewDetails}>View Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleClose('manual')} disabled={isClosing}>
              Close (Manual)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('stop_loss')} disabled={isClosing}>
              Close (Stop Loss)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('tp1')} disabled={isClosing}>
              Close (TP1)
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => handleClose('tp2')} disabled={isClosing}>
              Close (TP2)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('tp3')} disabled={isClosing}>
              Close (TP3)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('tp4')} disabled={isClosing}>
              Close (TP4)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('tp5')} disabled={isClosing}>
              Close (TP5)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('reversal_after_tp')} disabled={isClosing}>
              Close (Reversal After TP)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClose('all_tps_hit')} disabled={isClosing}>
              Close (All TPs Hit)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Type: {signal.tradeType}
          </p>
          <p className="text-sm text-muted-foreground">
            Entry: {signal.entryPrice}
          </p>
          <p className="text-sm text-muted-foreground">
            Stop Loss: {signal.stopLoss}
          </p>
          <Badge variant="secondary">{signal.status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
});

EnhancedSignalCard.displayName = 'EnhancedSignalCard';

export default EnhancedSignalCard;
