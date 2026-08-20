export type ContractStatus =
  | "created"
  | "pending_confirmation"
  | "confirmed"
  | "active"
  | "returned"
  | "returned_pending_dispute"
  | "completed"
  | "disputed"
  | "cancelled";

export interface Contract {
  id: string;
  deal_id: string;
  offer_id: string;
  resource_id: string;
  requester_id: string;
  provider_id: string;
  rental_fee: number;
  security_deposit: number;
  declared_value: number;
  lend_fee: number;
  security_amount: number;
  platform_fee: number;
  status: ContractStatus;
  requester_confirmed: boolean;
  provider_confirmed: boolean;
  contact_revealed: boolean;
  checked_out_at: string | null;
  returned_at: string | null;
  dispute_deadline: string | null;
  condition_disputed: boolean;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletSummary {
  balance: number;
  locked_balance: number;
}

export interface HandoffToken {
  token: string;
  expiresAt: string;
  purpose: "checkout" | "return";
}
