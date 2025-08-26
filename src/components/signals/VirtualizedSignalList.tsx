
import { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { EnhancedSignalCard } from './EnhancedSignalCard';

interface VirtualizedSignalListProps {
  alerts: TradeAlertWithProfile[];
  onUpdate?: (id: string, updates: any) => Promise<void>;
  isOwner?: (userId: string) => boolean;
  height: number;
  itemHeight?: number;
  compact?: boolean;
}

interface ListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    alerts: TradeAlertWithProfile[];
    onUpdate?: (id: string, updates: any) => Promise<void>;
    isOwner?: (userId: string) => boolean;
    compact?: boolean;
  };
}

const ListItem = memo(({ index, style, data }: ListItemProps) => {
  const { alerts, onUpdate, isOwner, compact } = data;
  const alert = alerts[index];

  if (!alert) return null;

  return (
    <div style={style} className="px-2">
      <div className={compact ? 'mb-2' : 'mb-4'}>
        <EnhancedSignalCard
          alert={alert}
          onUpdate={onUpdate}
          isOwner={isOwner?.(alert.userId)}
          compact={compact}
        />
      </div>
    </div>
  );
});

ListItem.displayName = 'ListItem';

export const VirtualizedSignalList = memo(({
  alerts,
  onUpdate,
  isOwner,
  height,
  itemHeight = 200,
  compact = false
}: VirtualizedSignalListProps) => {
  const adjustedItemHeight = compact ? Math.floor(itemHeight * 0.7) : itemHeight;

  const itemData = useMemo(() => ({
    alerts,
    onUpdate,
    isOwner,
    compact
  }), [alerts, onUpdate, isOwner, compact]);

  // Buffer size calculation for smooth scrolling
  const bufferSize = Math.min(10, Math.ceil(height / adjustedItemHeight) + 5);

  return (
    <List
      height={height}
      width="100%" // Add the required width property
      itemCount={alerts.length}
      itemSize={adjustedItemHeight}
      itemData={itemData}
      overscanCount={bufferSize}
      className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
    >
      {ListItem}
    </List>
  );
});

VirtualizedSignalList.displayName = 'VirtualizedSignalList';
