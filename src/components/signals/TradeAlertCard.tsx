
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, Target, Shield, User, Calendar } from "lucide-react";
import { formatPrice } from "@/utils/formatters";
import { TradeAlertData } from "./TradeAlertData";
import { SignalStatusBadge } from "./SignalStatusBadge";
import { SignalActionButtons } from "./SignalActionButtons";
import { useAuth } from "@/contexts/AuthContext";

interface TradeAlertCardProps {
  alert: TradeAlertData;
  showCreator?: boolean;
}

export const TradeAlertCard = ({ alert, showCreator = true }: TradeAlertCardProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === alert.creator?.id;
  
  // Determine if this is a sell order for red styling
  const isSellOrder = alert.trade_type === 'sell' || alert.trade_type === 'sell_limit';
  
  // Apply conditional styling based on trade type
  const borderColor = isSellOrder ? 'border-l-red-500' : 'border-l-green-500';
  const iconColor = isSellOrder ? 'text-red-500' : 'text-green-500';
  const bgColor = isSellOrder ? 'bg-red-50' : 'bg-green-50';

  const TradeIcon = alert.trade_type.includes('buy') ? TrendingUp : TrendingDown;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTakeProfits = () => {
    const tps = [];
    if (alert.tp1) tps.push({ level: 1, price: alert.tp1, hit: alert.tp_hits.includes(1) });
    if (alert.tp2) tps.push({ level: 2, price: alert.tp2, hit: alert.tp_hits.includes(2) });
    if (alert.tp3) tps.push({ level: 3, price: alert.tp3, hit: alert.tp_hits.includes(3) });
    if (alert.tp4) tps.push({ level: 4, price: alert.tp4, hit: alert.tp_hits.includes(4) });
    if (alert.tp5) tps.push({ level: 5, price: alert.tp5, hit: alert.tp_hits.includes(5) });
    return tps;
  };

  const takeProfits = getTakeProfits();

  return (
    <Card className={`p-4 border-l-4 ${borderColor} ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${bgColor}`}>
            <TradeIcon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{alert.asset_name}</h3>
            <p className="text-sm text-gray-600">{alert.tradermade_symbol}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SignalStatusBadge 
            status={alert.status} 
            tradeType={alert.trade_type}
          />
          <SignalActionButtons signal={alert} isOwner={isOwner} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Entry</span>
            <span className="text-sm font-mono">{formatPrice(alert.entry_price)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium">Stop Loss</span>
            <span className="text-sm font-mono">{formatPrice(alert.stop_loss)}</span>
          </div>
        </div>

        {takeProfits.length > 0 && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">Take Profits</span>
            <div className="space-y-1">
              {takeProfits.map((tp) => (
                <div key={tp.level} className="flex items-center gap-2">
                  <Badge 
                    variant={tp.hit ? "default" : "outline"} 
                    className={`w-8 h-6 flex items-center justify-center text-xs ${
                      tp.hit ? 'bg-green-500 text-white' : ''
                    }`}
                  >
                    {tp.level}
                  </Badge>
                  <span className={`text-sm font-mono ${tp.hit ? 'text-green-600 font-medium' : ''}`}>
                    {formatPrice(tp.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {alert.notes && (
        <div className="mb-3 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
          <p className="text-sm text-gray-700">{alert.notes}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
        <div className="flex items-center gap-4">
          {showCreator && alert.creator && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{alert.creator.display_name || 'Anonymous'}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(alert.created_date)}</span>
          </div>
        </div>
        
        {alert.close_reason && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="capitalize">
              {alert.close_reason.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
