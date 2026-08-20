-- 017_add_ratings.sql
-- Persist per-contract ratings and link to profile aggregates

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL,
    rater_id uuid NOT NULL,
    rated_id uuid NOT NULL,
    score integer NOT NULL,
    review text NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ratings_pkey PRIMARY KEY (id),
    CONSTRAINT ratings_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts (id) ON DELETE CASCADE,
    CONSTRAINT ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT ratings_rated_id_fkey FOREIGN KEY (rated_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
    CONSTRAINT ratings_contract_rater_unique UNIQUE (contract_id, rater_id),
    CONSTRAINT ratings_score_check CHECK (score >= 1 AND score <= 5)
);

CREATE INDEX IF NOT EXISTS ratings_rated_id_idx ON public.ratings (rated_id);
CREATE INDEX IF NOT EXISTS ratings_contract_id_idx ON public.ratings (contract_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
