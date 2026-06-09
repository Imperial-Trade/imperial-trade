import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function BroadcastsSection() {
  return (
    <div className="space-y-6">
      <ComingSoonCard
        title="Broadcasts"
        description="Send a one-to-many message to everyone in a room you own. Replies stay private to the sender — like WhatsApp broadcasts, for traders."
      />
    </div>
  );
}
