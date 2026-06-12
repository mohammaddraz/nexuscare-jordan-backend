-- Migration: Add COVERAGE_REQUESTS table
-- Run this against the existing database to add coverage modification request support.

CREATE TABLE IF NOT EXISTS COVERAGE_REQUESTS (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES PATIENTS(id) ON DELETE CASCADE,
    user_id UUID REFERENCES USERS(id) ON DELETE CASCADE,
    current_plan VARCHAR(100) NOT NULL,
    requested_plan VARCHAR(100) NOT NULL,
    deductible_preference VARCHAR(50) DEFAULT 'standard',
    rider_dental BOOLEAN DEFAULT FALSE,
    rider_vision BOOLEAN DEFAULT FALSE,
    rider_maternity BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    admin_notes TEXT,
    date_requested TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_reviewed TIMESTAMP
);
