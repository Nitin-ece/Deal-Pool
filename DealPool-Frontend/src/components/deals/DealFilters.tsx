import React from "react";
import { useAppDispatch, useAppSelector } from "../../redux/store";
import { setSelectedCategory, setSearchQuery, setSelectedStatus } from "../../redux/slices/dealsSlice";
import { Search, Box, Code, Wrench, Package, Layers } from "lucide-react";

const CATEGORIES: Array<{ label: string; value: string; icon: React.ReactNode }> = [
  { label: "All Needs", value: "All", icon: <Layers className="w-3.5 h-3.5" /> },
  { label: "Physical Resource", value: "Physical Resource", icon: <Box className="w-3.5 h-3.5" /> },
  { label: "Skill", value: "Skill", icon: <Code className="w-3.5 h-3.5" /> },
  { label: "Service", value: "Service", icon: <Wrench className="w-3.5 h-3.5" /> },
  { label: "Equipment", value: "Equipment", icon: <Package className="w-3.5 h-3.5" /> },
];

export function DealFilters() {
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector((state) => state.deals.selectedCategory);
  const searchQuery = useAppSelector((state) => state.deals.searchQuery);
  const selectedStatus = useAppSelector((state) => state.deals.selectedStatus);

  return (
    <div className="space-y-3">
      {/* Search Input & Status Selector */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            id="deal-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="Search needs, skills, equipment..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] rounded-xl text-xs sm:text-sm text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)] transition-all placeholder:text-[var(--muted)]"
          />
          {searchQuery && (
            <button
              onClick={() => dispatch(setSearchQuery(""))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            id="status-filter-select"
            value={selectedStatus}
            onChange={(e) => dispatch(setSelectedStatus(e.target.value))}
            className="px-3.5 py-2.5 bg-[var(--surface)] rounded-xl text-xs font-semibold text-[var(--ink)] border border-[var(--line)] focus:outline-none focus:ring-2 focus:ring-[var(--signal)] transition-all cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open Needs</option>
            <option value="offer_accepted">Matched</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Category Chips matching Editorial Aesthetic */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <button
              key={cat.value}
              id={`filter-category-${cat.value.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => dispatch(setSelectedCategory(cat.value))}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[var(--signal)] text-white font-bold shadow-md scale-102"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--line)]/40 hover:text-[var(--ink)] border border-[var(--line)]"
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

