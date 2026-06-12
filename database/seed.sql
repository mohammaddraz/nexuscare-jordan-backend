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
('44444444-4444-4444-4444-444444444444', 'tariq.haddad@istiklal.jo', crypt('password123', gen_salt('bf')), 'PROVIDER'),
('77777777-7777-7777-7777-777777777777', 'mahmoud.z@jordanmed.jo', crypt('password123', gen_salt('bf')), 'PROVIDER'),
('88888888-8888-8888-8888-888888888888', 'huda.s@ammanclinic.jo', crypt('password123', gen_salt('bf')), 'PROVIDER');

-- Insert Consumers (Primary Account Holders)
INSERT INTO USERS (id, email, password_hash, role) VALUES 
('55555555-5555-5555-5555-555555555555', 'ahmed.alamiri@gmail.com', crypt('password123', gen_salt('bf')), 'CONSUMER'),
('66666666-6666-6666-6666-666666666666', 'sara.kamel@yahoo.com', crypt('password123', gen_salt('bf')), 'CONSUMER');

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
('44444444-4444-4444-4444-444444444444', 'Dr. Tariq Haddad', 'General Practice', 'Istiklal Hospital', 'Amman', 4.5, TRUE, 31.9680, 35.9180),
('77777777-7777-7777-7777-777777777777', 'Dr. Mahmoud Zayyad', 'Pediatrics', 'Jordan Medical Center', 'Zarqa', 4.9, FALSE, 32.0653, 36.0895),
('88888888-8888-8888-8888-888888888888', 'Dr. Huda Suleiman', 'Dermatology', 'Amman Skin Clinic', 'Amman', 4.7, TRUE, 31.9800, 35.8500);

--------------------------------------------------------------------------------
-- 4. SEED PATIENTS
--------------------------------------------------------------------------------
INSERT INTO PATIENTS (id, user_id, name, relation, dob, national_id, plan_type, coverage_limit, used_coverage, approval_status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'Ahmed Al-Amiri', 'Primary', '1982-05-14', '9821034455', 'Platinum Care JOR', 50000.00, 1250.00, 'Approved'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Rania Al-Amiri', 'Spouse', '1985-08-22', '9852045566', 'Platinum Care JOR', 50000.00, 0.00, 'Approved'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Omar Al-Amiri', 'Child', '2012-03-10', '2012012233', 'Gold Shield JOR', 25000.00, 450.00, 'Pending'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'Sara Kamel', 'Primary', '1990-11-20', '9901054321', 'Basic Silver JOR', 10000.00, 50.00, 'Approved');

--------------------------------------------------------------------------------
-- 5. SEED PCP_ASSIGNMENTS
--------------------------------------------------------------------------------
INSERT INTO PCP_ASSIGNMENTS (patient_id, provider_id, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Approved'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Pending'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', 'Approved');

--------------------------------------------------------------------------------
-- 6. SEED MEDICAL_RECORDS
--------------------------------------------------------------------------------
INSERT INTO MEDICAL_RECORDS (id, patient_id, provider_id, record_date, diagnosis, icd_code, prescription, notes) VALUES 
('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-10-15', 'Essential (primary) hypertension', 'I10', 'Amlodipine 5mg daily', 'Blood pressure slightly elevated. Monitor diet and sodium intake.'),
('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-12-10', 'Type 2 diabetes mellitus', 'E11.9', 'Metformin 500mg', 'Patient responding well to treatment. Advised to continue exercise.'),
('10000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', '2024-01-20', 'Allergic contact dermatitis', 'L23.9', 'Hydrocortisone cream 1%', 'Apply thinly to affected areas twice daily.');

--------------------------------------------------------------------------------
-- 7. SEED CLAIMS
--------------------------------------------------------------------------------
INSERT INTO CLAIMS (patient_id, provider_id, claim_date, claim_type, billing_code, amount, deductible_applied, status) VALUES 
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-10-15', 'Outpatient Consultation', '99213', 50.00, 10.00, 'Paid'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', '2023-11-02', 'Pharmacy Prescription', 'RX-123', 15.50, 0.00, 'Pending'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', '2023-12-10', 'Lab Test - Blood Work', '80050', 85.00, 15.00, 'Paid'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '88888888-8888-8888-8888-888888888888', '2024-01-20', 'Specialist Consultation', '99214', 65.00, 20.00, 'Paid');

--------------------------------------------------------------------------------
-- 8. SEED CERTIFICATIONS
--------------------------------------------------------------------------------
INSERT INTO CERTIFICATIONS (provider_id, license_number, date_submitted, status) VALUES 
('33333333-3333-3333-3333-333333333333', 'JOR-MD-88124', '2023-12-01', 'Approved'),
('77777777-7777-7777-7777-777777777777', 'JOR-MD-99234', '2024-01-15', 'Pending Review'),
('88888888-8888-8888-8888-888888888888', 'JOR-MD-11345', '2023-11-10', 'Approved');

-- End of Script
