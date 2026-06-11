-- NexusCare Jordan Backend Database Seed Data
-- Run this script AFTER schema.sql to populate initial mock data.

-- We will use pgcrypto to hash the passwords
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--------------------------------------------------------------------------------
-- 1. SEED USERS (Passwords are 'password123' hashed using bcrypt)
--------------------------------------------------------------------------------

-- Insert Admins
INSERT INTO USERS (id, email, password_hash, role) VALUES 
('11111111-1111-1111-1111-111111111111', 'faisal.rifai@moh.gov.jo', crypt('password123', gen_salt('bf')), 'ADMIN'),
('22222222-2222-2222-2222-222222222222', 'layla.mahmoud@moh.gov.jo', crypt('password123', gen_salt('bf')), 'ADMIN');

-- Insert Providers
INSERT INTO USERS (id, email, password_hash, role) VALUES 
('33333333-3333-3333-3333-333333333333', 'reem.khalidi@alkhalidi.jo', crypt('password123', gen_salt('bf')), 'PROVIDER'),
('44444444-4444-4444-4444-444444444444', 'tariq.haddad@istiklal.jo', crypt('password123', gen_salt('bf')), 'PROVIDER');

-- Insert Consumers (Primary Account Holders)
INSERT INTO USERS (id, email, password_hash, role) VALUES 
('55555555-5555-5555-5555-555555555555', 'ahmed.alamiri@gmail.com', crypt('password123', gen_salt('bf')), 'CONSUMER');

--------------------------------------------------------------------------------
-- 2. SEED ADMINS
--------------------------------------------------------------------------------
INSERT INTO ADMINS (user_id, name, admin_role, status, last_login) VALUES 
('11111111-1111-1111-1111-111111111111', 'Faisal Al-Rifai', 'SUPER_ADMIN', 'Active', CURRENT_TIMESTAMP),
('22222222-2222-2222-2222-222222222222', 'Layla Mahmoud', 'COMPLIANCE_OFFICER', 'Active', CURRENT_TIMESTAMP);

--------------------------------------------------------------------------------
-- 3. SEED PROVIDERS
--------------------------------------------------------------------------------
INSERT INTO PROVIDERS (user_id, name, specialty, clinic, city, rating, accepting_new, lat, lng) VALUES 
('33333333-3333-3333-3333-333333333333', 'Dr. Reem Al-Khalidi', 'Cardiology', 'Al-Khalidi Medical Plaza', 'Amman', 4.8, TRUE, 31.9539, 35.9106),
('44444444-4444-4444-4444-444444444444', 'Dr. Tariq Haddad', 'General Practice', 'Istiklal Hospital', 'Amman', 4.5, TRUE, 31.9680, 35.9180);

--------------------------------------------------------------------------------
-- 4. SEED PATIENTS
--------------------------------------------------------------------------------
INSERT INTO PATIENTS (id, user_id, name, relation, dob, national_id, plan_type, coverage_limit, used_coverage, approval_status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Ahmed Al-Amiri', 'Primary', '1982-05-14', '9821034455', 'Platinum Care JOR', 50000.00, 1250.00, 'Approved'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Rania Al-Amiri', 'Spouse', '1985-08-22', '9852045566', 'Platinum Care JOR', 50000.00, 0.00, 'Approved'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Omar Al-Amiri', 'Child', '2012-03-10', '2012012233', 'Gold Shield JOR', 25000.00, 450.00, 'Pending');

--------------------------------------------------------------------------------
-- 5. SEED PCP_ASSIGNMENTS
--------------------------------------------------------------------------------
INSERT INTO PCP_ASSIGNMENTS (patient_id, provider_id, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Approved'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Pending');

--------------------------------------------------------------------------------
-- 6. SEED MEDICAL_RECORDS
--------------------------------------------------------------------------------
INSERT INTO MEDICAL_RECORDS (id, patient_id, provider_id, record_date, diagnosis, icd_code, prescription, notes) VALUES 
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-10-15', 'Essential (primary) hypertension', 'I10', 'Amlodipine 5mg daily', 'Blood pressure slightly elevated. Monitor diet and sodium intake.');

--------------------------------------------------------------------------------
-- 7. SEED CLAIMS
--------------------------------------------------------------------------------
INSERT INTO CLAIMS (patient_id, provider_id, claim_date, claim_type, billing_code, amount, deductible_applied, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-10-15', 'Outpatient Consultation', '99213', 50.00, 10.00, 'Paid'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', '2023-11-02', 'Pharmacy Prescription', 'RX-123', 15.50, 0.00, 'Pending');

--------------------------------------------------------------------------------
-- 8. SEED CERTIFICATIONS
--------------------------------------------------------------------------------
INSERT INTO CERTIFICATIONS (provider_id, license_number, date_submitted, status) VALUES 
('33333333-3333-3333-3333-333333333333', 'JOR-MD-88124', '2023-12-01', 'Approved');

-- End of Script
