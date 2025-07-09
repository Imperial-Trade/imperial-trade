
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Share2, MessageSquare, Send, CheckCircle, XCircle } from 'lucide-react';
import { signalSharingService, TradeSignal } from '@/services/SignalSharingService';
import { useToast } from '@/hooks/use-toast';

interface SignalSharingModalProps {
  signal: TradeSignal;
  trigger?: React.ReactNode;
}

const platformIcons = {
  discord: '🔵',
  slack: '💬',
  telegram: '📱',
  twitter: '🐦'
};

const platformLabels = {
  discord: 'Discord',
  slack: 'Slack',
  telegram: 'Telegram',
  twitter: 'Twitter'
};

export default function SignalSharingModal({ signal, trigger }: SignalSharingModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareResults, setShareResults] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleShare = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "No platforms selected",
        description: "Please select at least one platform to share to.",
        variant: "destructive"
      });
      return;
    }

    setIsSharing(true);
    try {
      const result = await signalSharingService.shareSignal({
        signal,
        platforms: selectedPlatforms as any,
        customMessage: customMessage || undefined
      });

      setShareResults(result);
      
      const successCount = result.platforms.filter(p => p.success).length;
      const totalCount = result.platforms.length;

      if (successCount === totalCount) {
        toast({
          title: "Signal shared successfully!",
          description: `Shared to ${successCount} platform${successCount > 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: "Partial success",
          description: `Shared to ${successCount}/${totalCount} platforms`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Sharing failed",
        description: error instanceof Error ? error.message : "Failed to share signal",
        variant: "destructive"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const resetModal = () => {
    setSelectedPlatforms([]);
    setCustomMessage('');
    setShareResults(null);
    setIsSharing(false);
  };

  const defaultMessage = signalSharingService.formatSignalMessage(signal);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetModal();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20">
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Trade Signal
          </DialogTitle>
        </DialogHeader>

        {!shareResults ? (
          <div className="space-y-4">
            {/* Signal Preview */}
            <div className="bg-surface/50 rounded-lg p-3 border border-default">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{signal.assetName}</Badge>
                <Badge className={signal.tradeType.includes('buy') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                  {signal.tradeType.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-secondary space-y-1">
                <div>Entry: ${signal.entryPrice}</div>
                <div>Stop Loss: ${signal.stopLoss}</div>
                <div>Take Profits: {signal.takeProfits.map((tp, i) => `TP${i + 1}: $${tp}`).join(', ')}</div>
              </div>
            </div>

            {/* Platform Selection */}
            <div>
              <h4 className="font-medium mb-3">Select Platforms</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(platformLabels).map(([platform, label]) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={selectedPlatforms.includes(platform)}
                      onCheckedChange={() => handlePlatformToggle(platform)}
                    />
                    <label
                      htmlFor={platform}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <span>{platformIcons[platform as keyof typeof platformIcons]}</span>
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <h4 className="font-medium mb-2">Custom Message (Optional)</h4>
              <Textarea
                placeholder={defaultMessage}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <p className="text-xs text-secondary mt-1">
                Leave empty to use default format
              </p>
            </div>

            {/* Share Button */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleShare}
                disabled={isSharing || selectedPlatforms.length === 0}
                className="flex-1"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Share Signal
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Share Results */
          <div className="space-y-4">
            <h4 className="font-medium">Sharing Results</h4>
            <div className="space-y-2">
              {shareResults.platforms.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded bg-surface/50">
                  <div className="flex items-center gap-2">
                    <span>{platformIcons[result.platform as keyof typeof platformIcons]}</span>
                    <span className="capitalize">{result.platform}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm text-secondary">
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
