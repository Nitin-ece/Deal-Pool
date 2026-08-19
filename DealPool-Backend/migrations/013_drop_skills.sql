-- 013_drop_skills.sql
-- Drop skill_id columns and constraints from deals and transactions, drop skills table

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_skill_id_fkey;
ALTER TABLE public.deals DROP COLUMN IF EXISTS skill_id;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_skill_id_fkey;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS skill_id;

DROP TABLE IF EXISTS public.skills CASCADE;
