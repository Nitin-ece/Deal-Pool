-- 016_add_reports.sql
-- Create reports table for damage claims and dispute resolutions

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
            'damage_claim'::text,
            'overcharge'::text,
            'other'::text
        ])
    ),
    CONSTRAINT reports_status_check CHECK (
        status = ANY (ARRAY[
            'pending'::text,
            'resolved_damage'::text,
            'resolved_dismissed'::text,
            'resolved_overcharge'::text,
            'upheld'::text,
            'dismissed'::text
        ])
    )
);

CREATE INDEX IF NOT EXISTS reports_contract_id_idx ON public.reports (contract_id);
CREATE INDEX IF NOT EXISTS reports_reporter_id_idx ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
