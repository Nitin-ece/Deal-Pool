export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export interface UserProfile {
  id: string;
  firebase_uid: string;
  username: string;
  email: string;
  profile_photo: string | null;
  role: "user" | "admin";
  avg_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  auth_provider?: "password" | "google" | string;
  has_password?: boolean;
}

export type DealCategory =
  | "Physical Resource"
  | "Skill"
  | "Service"
  | "Equipment"
  | "Other";

export type DealStatus = "open" | "offer_accepted" | "completed" | "cancelled";

export interface Deal {
  id: string;
  user_id: string;
  creator?: {
    id: string;
    username: string;
    profile_photo: string | null;
    avg_rating: number;
    rating_count: number;
  };
  title: string;
  description: string;
  category: DealCategory;
  budget_min: number;
  budget_max: number;
  lat: number;
  lng: number;
  address?: string;
  image_url?: string;
  radius_km: number;
  status: DealStatus;
  distance_km?: number;
  exact_location_visible?: boolean;
  created_at: string;
  updated_at: string;
}

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Offer {
  id: string;
  deal_id: string;
  provider_id: string;
  provider?: {
    id: string;
    username: string;
    profile_photo: string | null;
    avg_rating: number;
    rating_count: number;
  };
  price: number;
  terms: string;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
  address?: string;
}
