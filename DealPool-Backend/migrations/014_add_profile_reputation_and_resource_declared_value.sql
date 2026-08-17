-- Add reputation columns to profiles and declared_value to resources

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS reliability_strikes integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS trust_score numeric(4, 2) NOT NULL DEFAULT 5.00;

ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS declared_value numeric(12, 2) NOT NULL DEFAULT 0.00;
