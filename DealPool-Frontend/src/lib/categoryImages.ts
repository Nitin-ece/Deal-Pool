/**
 * Category → fallback image map.
 * Single source of truth — previously copy-pasted in DealCard, MyDeals, and DealDetail.
 */
export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "Physical Resource":
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80",
  Skill:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
  Service:
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
  Equipment:
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
  Other:
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
};

/** Get the fallback image for a deal category. */
export const getCategoryImage = (category: string | null | undefined): string =>
  DEFAULT_CATEGORY_IMAGES[category ?? "Other"] ?? DEFAULT_CATEGORY_IMAGES["Other"];
