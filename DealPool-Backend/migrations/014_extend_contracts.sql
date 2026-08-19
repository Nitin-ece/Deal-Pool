-- 014_extend_contracts.sql
-- Extend transactions and contracts with frozen value columns and contract lifecycle state

-- Extend profiles with reputation tracking
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS reliability_strikes integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS trust_score numeric(4, 2) NOT NULL DEFAULT 5.00;

-- Extend transactions table
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS declared_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lend_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS security_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS platform_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS security_deposit_rate numeric(4, 2) NOT NULL DEFAULT 0.15,
    ADD COLUMN IF NOT EXISTS requester_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS provider_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS confirm_deadline timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS contact_revealed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS condition_disputed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS dispute_deadline timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason text NULL,
    ADD COLUMN IF NOT EXISTS proximity_flagged boolean NOT NULL DEFAULT false;

-- Create or update contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deal_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    rental_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    security_deposit numeric(12, 2) NOT NULL DEFAULT 0.00,
    declared_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    lend_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    security_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    platform_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    security_deposit_rate numeric(4, 2) NOT NULL DEFAULT 0.15,
    status text NOT NULL DEFAULT 'created',
    requester_confirmed boolean NOT NULL DEFAULT false,
    provider_confirmed boolean NOT NULL DEFAULT false,
    confirm_deadline timestamp with time zone NULL,
    contact_revealed boolean NOT NULL DEFAULT false,
    checked_out_at timestamp with time zone NULL,
    returned_at timestamp with time zone NULL,
    dispute_deadline timestamp with time zone NULL,
    condition_disputed boolean NOT NULL DEFAULT false,
    cancel_reason text NULL,
    proximity_flagged boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT contracts_pkey PRIMARY KEY (id),
    CONSTRAINT contracts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals (id) ON DELETE CASCADE,
    CONSTRAINT contracts_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers (id) ON DELETE CASCADE,
    CONSTRAINT contracts_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources (id) ON DELETE RESTRICT,
    CONSTRAINT contracts_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT contracts_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profiles (id) ON DELETE CASCADE
);

-- Ensure all columns exist on contracts table if it already existed
ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS declared_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS lend_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS security_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS platform_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS security_deposit_rate numeric(4, 2) NOT NULL DEFAULT 0.15,
    ADD COLUMN IF NOT EXISTS requester_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS provider_confirmed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS confirm_deadline timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS contact_revealed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS condition_disputed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS dispute_deadline timestamp with time zone NULL,
    ADD COLUMN IF NOT EXISTS cancel_reason text NULL,
    ADD COLUMN IF NOT EXISTS proximity_flagged boolean NOT NULL DEFAULT false;

-- Widen status constraint on contracts if present
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check CHECK (
    status = ANY (ARRAY[
        'created'::text,
        'pending_confirmation'::text,
        'confirmed'::text,
        'active'::text,
        'returned'::text,
        'returned_pending_dispute'::text,
        'completed'::text,
        'disputed'::text,
        'cancelled'::text
    ])
);

CREATE INDEX IF NOT EXISTS contracts_deal_id_idx ON public.contracts (deal_id);
CREATE INDEX IF NOT EXISTS contracts_offer_id_idx ON public.contracts (offer_id);
CREATE INDEX IF NOT EXISTS contracts_resource_id_idx ON public.contracts (resource_id);
CREATE INDEX IF NOT EXISTS contracts_requester_id_idx ON public.contracts (requester_id);
CREATE INDEX IF NOT EXISTS contracts_provider_id_idx ON public.contracts (provider_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts (status);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
