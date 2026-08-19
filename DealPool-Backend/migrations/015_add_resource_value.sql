-- 015_add_resource_value.sql
-- Add declared_value and security_deposit_rate to resources

ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS declared_value numeric(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS security_deposit_rate numeric(4, 2) NOT NULL DEFAULT 0.15;
