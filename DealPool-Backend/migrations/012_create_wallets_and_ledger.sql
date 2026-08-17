-- Wallets and double-entry ledger

CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    balance numeric(12, 2) NOT NULL DEFAULT 0.00,
    locked_balance numeric(12, 2) NOT NULL DEFAULT 0.00,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wallets_pkey PRIMARY KEY (id),
    CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT wallets_locked_balance_non_negative CHECK (locked_balance >= 0)
);

CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON public.wallets (user_id);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id uuid NULL,
    user_id uuid NOT NULL,
    amount numeric(12, 2) NOT NULL,
    entry_type text NOT NULL,
    description text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ledger_entries_pkey PRIMARY KEY (id),
    CONSTRAINT ledger_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT ledger_entries_type_check CHECK (
        entry_type = ANY (ARRAY[
            'deposit'::text,
            'withdrawal'::text,
            'escrow_lock_fee'::text,
            'escrow_lock_security'::text,
            'escrow_payout_fee'::text,
            'escrow_release_security'::text,
            'escrow_penalty'::text
        ])
    )
);

CREATE INDEX IF NOT EXISTS ledger_entries_user_id_idx ON public.ledger_entries (user_id);
CREATE INDEX IF NOT EXISTS ledger_entries_contract_id_idx ON public.ledger_entries (contract_id);

CREATE TABLE IF NOT EXISTS public.debts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    contract_id uuid NULL,
    amount numeric(12, 2) NOT NULL,
    status text NOT NULL DEFAULT 'outstanding',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT debts_pkey PRIMARY KEY (id),
    CONSTRAINT debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT debts_amount_positive CHECK (amount > 0),
    CONSTRAINT debts_status_check CHECK (
        status = ANY (ARRAY[
            'outstanding'::text,
            'settled'::text
        ])
    )
);

CREATE INDEX IF NOT EXISTS debts_user_id_idx ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS debts_contract_id_idx ON public.debts (contract_id);
