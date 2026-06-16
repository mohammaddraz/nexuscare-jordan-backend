-- SehaGrid Jordan Backend Database Schema
-- Run this script to initialize the PostgreSQL database tables.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure clean initialization
DROP TABLE IF EXISTS CERTIFICATIONS CASCADE;
DROP TABLE IF EXISTS CLAIMS CASCADE;
DROP TABLE IF EXISTS MEDICAL_RECORDS CASCADE;
DROP TABLE IF EXISTS PCP_ASSIGNMENTS CASCADE;
DROP TABLE IF EXISTS PATIENTS CASCADE;
DROP TABLE IF EXISTS PROVIDERS CASCADE;
DROP TABLE IF EXISTS ADMINS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

--------------------------------------------------------------------------------
-- 1. USERS TABLE
--------------------------------------------------------------------------------
CREATE TABLE USERS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('CONSUMER', 'PROVIDER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------------------------------------
-- 2. ADMINS TABLE
--------------------------------------------------------------------------------
CREATE TABLE ADMINS (
    user_id UUID PRIMARY KEY REFERENCES USERS(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    admin_role VARCHAR(100) NOT NULL, -- e.g. SUPER_ADMIN, COMPLIANCE_OFFICER
    status VARCHAR(50) DEFAULT 'Active',
    last_login TIMESTAMP
);

--------------------------------------------------------------------------------
-- 3. PROVIDERS TABLE (Clinics & Doctors)
--------------------------------------------------------------------------------
CREATE TABLE PROVIDERS (
    user_id UUID PRIMARY KEY REFERENCES USERS(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(150),
    clinic VARCHAR(255),
    city VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    accepting_new BOOLEAN DEFAULT TRUE,
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6)
);

--------------------------------------------------------------------------------
-- 4. PATIENTS TABLE (Consumers / Dependents)
--------------------------------------------------------------------------------
CREATE TABLE PATIENTS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES USERS(id) ON DELETE CASCADE, -- Link to Primary Account Holder
    name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL, -- e.g., Primary, Spouse, Child
    dob DATE,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    plan_type VARCHAR(100),
    coverage_limit DECIMAL(10, 2) DEFAULT 0.00,
    used_coverage DECIMAL(10, 2) DEFAULT 0.00,
    avatar_url VARCHAR(500),
    approval_status VARCHAR(50) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected', 'Flagged'))
);

--------------------------------------------------------------------------------
-- 5. PCP_ASSIGNMENTS TABLE
--------------------------------------------------------------------------------
CREATE TABLE PCP_ASSIGNMENTS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES PATIENTS(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES PROVIDERS(user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    date_requested TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------------------------------------
-- 6. MEDICAL_RECORDS TABLE
--------------------------------------------------------------------------------
CREATE TABLE MEDICAL_RECORDS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES PATIENTS(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES PROVIDERS(user_id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    diagnosis VARCHAR(255),
    icd_code VARCHAR(20),
    prescription TEXT,
    notes TEXT
);

--------------------------------------------------------------------------------
-- 7. CLAIMS TABLE (Billing / Logs)
--------------------------------------------------------------------------------
CREATE TABLE CLAIMS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES PATIENTS(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES PROVIDERS(user_id) ON DELETE CASCADE,
    claim_date DATE NOT NULL,
    claim_type VARCHAR(100),
    billing_code VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    deductible_applied DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'In Review', 'Rejected'))
);

--------------------------------------------------------------------------------
-- 8. CERTIFICATIONS TABLE (Admin verification for Providers)
--------------------------------------------------------------------------------
CREATE TABLE CERTIFICATIONS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES PROVIDERS(user_id) ON DELETE CASCADE,
    license_number VARCHAR(100) NOT NULL,
    date_submitted DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Pending Review' CHECK (status IN ('Pending Review', 'Flagged', 'Approved'))
);

-- End of Script
