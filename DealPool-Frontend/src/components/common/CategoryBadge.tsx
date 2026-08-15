import { DealCategory } from "../../types";

export function CategoryBadge({ category }: { category: DealCategory | string }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--signal)]">
      {category}
    </span>
  );
}
