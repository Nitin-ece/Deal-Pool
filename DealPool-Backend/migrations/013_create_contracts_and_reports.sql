-- Contracts and Reports (Disputes)

CREATE TABLE IF NOT EXISTS public.contracts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deal_id uuid NOT NULL,
    offer_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    provider_id uuid NOT NULL,
    rental_fee numeric(12, 2) NOT NULL DEFAULT 0.00,
    security_deposit numeric(12, 2) NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'created',
    checked_out_at timestamp with time zone NULL,
    returned_at timestamp with time zone NULL,
    dispute_deadline timestamp with time zone NULL,
    condition_disputed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT contracts_pkey PRIMARY KEY (id),
    CONSTRAINT contracts_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals (id) ON DELETE CASCADE,
    CONSTRAINT contracts_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers (id) ON DELETE CASCADE,
    CONSTRAINT contracts_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resources (id) ON DELETE RESTRICT,
    CONSTRAINT contracts_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT contracts_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT contracts_status_check CHECK (
        status = ANY (ARRAY[
            'created'::text,
            'confirmed'::text,
            'active'::text,
            'returned'::text,
            'completed'::text,
            'disputed'::text,
            'cancelled'::text
        ])
    )
);

CREATE INDEX IF NOT EXISTS contracts_deal_id_idx ON public.contracts (deal_id);
CREATE INDEX IF NOT EXISTS contracts_offer_id_idx ON public.contracts (offer_id);
CREATE INDEX IF NOT EXISTS contracts_resource_id_idx ON public.contracts (resource_id);
CREATE INDEX IF NOT EXISTS contracts_requester_id_idx ON public.contracts (requester_id);
CREATE INDEX IF NOT EXISTS contracts_provider_id_idx ON public.contracts (provider_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts (status);

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    damage_award numeric(12, 2) NULL DEFAULT 0.00,
    resolved_by uuid NULL,
    resolution_notes text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT reports_pkey PRIMARY KEY (id),
    CONSTRAINT reports_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts (id) ON DELETE CASCADE,
    CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles (id) ON DELETE SET NULL,
    CONSTRAINT reports_reason_check CHECK (
        reason = ANY (ARRAY[
            'damage'::text,
            'overcharge'::text,
            'other'::text
        ])
    ),
    CONSTRAINT reports_status_check CHECK (
        status = ANY (ARRAY[
            'pending'::text,
            'resolved_damage'::text,
            'resolved_dismissed'::text,
            'resolved_overcharge'::text
        ])
    )
);

CREATE INDEX IF NOT EXISTS reports_contract_id_idx ON public.reports (contract_id);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);
