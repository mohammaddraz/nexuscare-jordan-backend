-- Migration: Add Insurance Companies and Provider Networks

-- 1. Create Insurance Companies Table
CREATE TABLE IF NOT EXISTS INSURANCE_COMPANIES (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'Active'
);

-- 2. Modify PATIENTS Table
ALTER TABLE PATIENTS ADD COLUMN IF NOT EXISTS insurance_company_id UUID REFERENCES INSURANCE_COMPANIES(id) ON DELETE SET NULL;
ALTER TABLE PATIENTS ADD COLUMN IF NOT EXISTS network_tier VARCHAR(50);

-- Update existing patients based on their plan_type
-- We will seed insurance companies first, then map them.

-- 3. Create PROVIDER_NETWORKS Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS PROVIDER_NETWORKS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES PROVIDERS(user_id) ON DELETE CASCADE,
    company_id UUID REFERENCES INSURANCE_COMPANIES(id) ON DELETE CASCADE,
    accepted_tier VARCHAR(50) NOT NULL CHECK (accepted_tier IN ('Basic', 'Standard', 'Premium')),
    UNIQUE(provider_id, company_id) -- A provider has one network mapping per company
);

-- 4. Modify COVERAGE_REQUESTS Table
ALTER TABLE COVERAGE_REQUESTS ADD COLUMN IF NOT EXISTS requested_company_id UUID REFERENCES INSURANCE_COMPANIES(id) ON DELETE SET NULL;

-- 5. Seed Data
-- Insert Insurance Companies
INSERT INTO INSURANCE_COMPANIES (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'NatHealth'),
('22222222-2222-2222-2222-222222222222', 'GIG Jordan'),
('33333333-3333-3333-3333-333333333333', 'MedNet')
ON CONFLICT (name) DO NOTHING;

-- Map existing Patients to Insurance and Tiers
UPDATE PATIENTS SET 
    insurance_company_id = '11111111-1111-1111-1111-111111111111', -- Default to NatHealth
    network_tier = CASE 
        WHEN plan_type = 'Platinum Care JOR' THEN 'Premium'
        WHEN plan_type = 'Gold Shield JOR' THEN 'Standard'
        ELSE 'Basic'
    END
WHERE insurance_company_id IS NULL;

-- 6. Seed Provider Networks
-- Get all providers and map them to all insurances just for seeding purposes, but with varying tiers
INSERT INTO PROVIDER_NETWORKS (provider_id, company_id, accepted_tier)
SELECT user_id, '11111111-1111-1111-1111-111111111111', 'Basic' FROM PROVIDERS
ON CONFLICT DO NOTHING;

INSERT INTO PROVIDER_NETWORKS (provider_id, company_id, accepted_tier)
SELECT user_id, '22222222-2222-2222-2222-222222222222', 'Standard' FROM PROVIDERS
ON CONFLICT DO NOTHING;

INSERT INTO PROVIDER_NETWORKS (provider_id, company_id, accepted_tier)
SELECT user_id, '33333333-3333-3333-3333-333333333333', 'Premium' FROM PROVIDERS
ON CONFLICT DO NOTHING;
