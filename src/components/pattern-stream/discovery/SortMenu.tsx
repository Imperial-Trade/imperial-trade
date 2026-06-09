import { Funnel } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortKey } from "@/hooks/pattern-stream/types";

const OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: "top_performance", label: "Top performance" },
  { id: "trending", label: "Trending" },
  { id: "most_active", label: "Most active" },
  { id: "newest", label: "Newest" },
];

interface SortMenuProps {
  value: SortKey;
  onChange: (value: SortKey) => void;
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  const current = OPTIONS.find((o) => o.id === value)?.label ?? "Sort";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ps-btn ps-btn-secondary"
          style={{ height: 36, padding: "0 12px", fontSize: 13 }}
          aria-label="Sort rooms"
        >
          <Funnel size={14} />
          <span>{current}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="liquid-glass"
        style={{ minWidth: 200, padding: 6, border: "1px solid var(--ps-border-subtle)" }}
      >
        {OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onSelect={() => onChange(opt.id)}
            className="ps-active-pill w-full justify-start"
            data-active={opt.id === value}
            style={{ borderRadius: 10, padding: "8px 12px" }}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
