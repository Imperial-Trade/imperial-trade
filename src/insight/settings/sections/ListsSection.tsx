import { ComingSoonCard } from '@/insight/settings/ComingSoonCard';

export function ListsSection() {
  return (
    <div className="space-y-6">
      <ComingSoonCard
        title="Lists"
        description="Group rooms by strategy or asset (e.g. FX scalpers, Crypto swing) to filter Discover and your feed."
      />
    </div>
  );
}
