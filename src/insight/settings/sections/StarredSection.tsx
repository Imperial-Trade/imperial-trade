import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function StarredSection() {
  return (
    <div className="space-y-6">
      <ComingSoonCard
        title="Starred signals"
        description="Tap the star on any message or signal to keep it here. Filter by room, asset, or date."
      />
    </div>
  );
}
