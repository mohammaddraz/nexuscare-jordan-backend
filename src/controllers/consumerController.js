const asyncHandler = require('express-async-handler');
const pgclient = require('../config/db');

/** 
 * @desc    Get all family members (dependents) for the logged-in consumer
 * @route   GET /api/consumers/family
 * @access  Private (CONSUMER)
 */
const getFamily = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT p.*, 
            pca.status AS pcp_status,
            prov.name AS pcp_name,
            prov.user_id AS pcp_id,
            ic.name AS insurance_company_name
     FROM PATIENTS p
     LEFT JOIN INSURANCE_COMPANIES ic ON ic.id = p.insurance_company_id
     LEFT JOIN PCP_ASSIGNMENTS pca ON pca.patient_id = p.id 
       AND pca.id = (SELECT id FROM PCP_ASSIGNMENTS WHERE patient_id = p.id ORDER BY date_requested DESC LIMIT 1)
     LEFT JOIN PROVIDERS prov ON prov.user_id = pca.provider_id
     WHERE p.user_id = $1
     ORDER BY 
       CASE p.relation WHEN 'Primary' THEN 0 WHEN 'Spouse' THEN 1 ELSE 2 END`,
    [req.user.id]
  );

  res.json(result.rows);
});

/**
 * @desc    Get all providers for the map directory
 * @route   GET /api/consumers/providers
 * @access  Private (CONSUMER)
 */
const getProviders = asyncHandler(async (req, res) => {
  const { city, specialty, accepting_new } = req.query;

  let query = `
    SELECT prov.user_id, prov.name, prov.specialty, prov.clinic, prov.city, prov.rating, prov.accepting_new, prov.lat, prov.lng,
           json_agg(json_build_object('company_id', pn.company_id, 'tier', pn.accepted_tier)) AS networks
    FROM PROVIDERS prov
    LEFT JOIN PROVIDER_NETWORKS pn ON pn.provider_id = prov.user_id
    WHERE 1=1
  `;
  const params = [];

  if (city) {
    params.push(city);
    query += ` AND city = $${params.length}`;
  }
  if (specialty) {
    params.push(specialty);
    query += ` AND specialty = $${params.length}`;
  }
  if (accepting_new === 'true') {
    query += ` AND accepting_new = TRUE`;
  }

  query += ` GROUP BY prov.user_id ORDER BY prov.rating DESC`;

  const result = await pgclient.query(query, params);
  res.json(result.rows);
});

/**
 * @desc    Request a PCP assignment for a family member
 * @route   POST /api/consumers/pcp-request
 * @access  Private (CONSUMER)
 */
const requestPCP = asyncHandler(async (req, res) => {
  const { patient_id, provider_id } = req.body;

  if (!patient_id || !provider_id) {
    res.status(400);
    throw new Error('Patient ID and Provider ID are required');
  }

  // Verify that the patient belongs to this consumer
  const patientCheck = await pgclient.query(
    'SELECT id, insurance_company_id, network_tier FROM PATIENTS WHERE id = $1 AND user_id = $2',
    [patient_id, req.user.id]
  );

  if (patientCheck.rows.length === 0) {
    res.status(403);
    throw new Error('You can only request PCP for your own family members');
  }

  const patient = patientCheck.rows[0];

  // Verify provider network
  const networkCheck = await pgclient.query(
    `SELECT accepted_tier FROM PROVIDER_NETWORKS 
     WHERE provider_id = $1 AND company_id = $2`,
    [provider_id, patient.insurance_company_id]
  );

  if (networkCheck.rows.length === 0) {
    res.status(400);
    throw new Error('This provider does not accept your insurance company.');
  }

  const providerTier = networkCheck.rows[0].accepted_tier;
  const patientTier = patient.network_tier;

  // Tier logic: Premium patients can see Premium, Standard, Basic providers.
  // Standard patients can see Standard, Basic providers.
  // Basic patients can see Basic providers.
  const tierValue = { 'Premium': 3, 'Standard': 2, 'Basic': 1 };
  if (tierValue[providerTier] > tierValue[patientTier]) {
    res.status(400);
    throw new Error(`This provider requires a ${providerTier} network tier. Your current tier is ${patientTier}.`);
  }

  // Create the PCP assignment request
  const result = await pgclient.query(
    `INSERT INTO PCP_ASSIGNMENTS (patient_id, provider_id, status) 
     VALUES ($1, $2, 'Pending') RETURNING *`,
    [patient_id, provider_id]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @desc    Get medical records for a specific family member
 * @route   GET /api/consumers/records/:patientId
 * @access  Private (CONSUMER)
 */
const getMedicalRecords = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  // Verify patient belongs to this consumer
  const patientCheck = await pgclient.query(
    'SELECT id FROM PATIENTS WHERE id = $1 AND user_id = $2',
    [patientId, req.user.id]
  );

  if (patientCheck.rows.length === 0) {
    res.status(403);
    throw new Error('Access denied');
  }

  const result = await pgclient.query(
    `SELECT mr.*, prov.name AS provider_name 
     FROM MEDICAL_RECORDS mr
     JOIN PROVIDERS prov ON prov.user_id = mr.provider_id
     WHERE mr.patient_id = $1
     ORDER BY mr.record_date DESC`,
    [patientId]
  );

  res.json(result.rows);
});

/**
 * @desc    Get claims for a specific family member
 * @route   GET /api/consumers/claims/:patientId
 * @access  Private (CONSUMER)
 */
const getClaims = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  // Verify patient belongs to this consumer
  const patientCheck = await pgclient.query(
    'SELECT id FROM PATIENTS WHERE id = $1 AND user_id = $2',
    [patientId, req.user.id]
  );

  if (patientCheck.rows.length === 0) {
    res.status(403);
    throw new Error('Access denied');
  }

  const result = await pgclient.query(
    `SELECT c.*, prov.name AS provider_name 
     FROM CLAIMS c
     JOIN PROVIDERS prov ON prov.user_id = c.provider_id
     WHERE c.patient_id = $1
     ORDER BY c.claim_date DESC`,
    [patientId]
  );

  res.json(result.rows);
});

/**
 * @desc    Get PCP assignment history for all family members
 * @route   GET /api/consumers/pcp-history
 * @access  Private (CONSUMER)
 */
const getPCPHistory = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT pca.id, pca.status, pca.date_requested,
            pat.name AS patient_name,
            prov.name AS provider_name
     FROM PCP_ASSIGNMENTS pca
     JOIN PATIENTS pat ON pat.id = pca.patient_id
     JOIN PROVIDERS prov ON prov.user_id = pca.provider_id
     WHERE pat.user_id = $1
     ORDER BY pca.date_requested DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

/**
 * @desc    Submit a coverage modification request
 * @route   POST /api/consumers/coverage-request
 * @access  Private (CONSUMER)
 */
const submitCoverageRequest = asyncHandler(async (req, res) => {
  const { patient_id, current_plan, requested_plan, deductible_preference, rider_dental, rider_vision, rider_maternity } = req.body;

  if (!patient_id || !requested_plan) {
    res.status(400);
    throw new Error('Patient ID and requested plan are required');
  }

  // Verify patient belongs to this consumer
  const patientCheck = await pgclient.query(
    'SELECT id, plan_type FROM PATIENTS WHERE id = $1 AND user_id = $2',
    [patient_id, req.user.id]
  );

  if (patientCheck.rows.length === 0) {
    res.status(403);
    throw new Error('You can only submit coverage requests for your own family members');
  }

  const result = await pgclient.query(
    `INSERT INTO COVERAGE_REQUESTS (patient_id, user_id, current_plan, requested_plan, deductible_preference, rider_dental, rider_vision, rider_maternity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [patient_id, req.user.id, current_plan || patientCheck.rows[0].plan_type, requested_plan, deductible_preference || 'standard', rider_dental || false, rider_vision || false, rider_maternity || false]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @desc    Get coverage requests for the logged-in consumer's family
 * @route   GET /api/consumers/coverage-requests
 * @access  Private (CONSUMER)
 */
const getCoverageRequests = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT cr.*, pat.name AS patient_name
     FROM COVERAGE_REQUESTS cr
     JOIN PATIENTS pat ON pat.id = cr.patient_id
     WHERE cr.user_id = $1
     ORDER BY cr.date_requested DESC`,
    [req.user.id]
  );
  res.json(result.rows);
});

/**
 * @desc    Submit a new reimbursement claim
 * @route   POST /api/consumers/claims
 * @access  Private (CONSUMER)
 */
const submitClaim = asyncHandler(async (req, res) => {
  const { patient_id, provider_id, claim_date, amount } = req.body;

  if (!patient_id || !provider_id || !claim_date || !amount) {
    res.status(400);
    throw new Error('Please provide patient_id, provider_id, claim_date, and amount');
  }

  // Verify patient belongs to this consumer
  const patientCheck = await pgclient.query(
    'SELECT id FROM PATIENTS WHERE id = $1 AND user_id = $2',
    [patient_id, req.user.id]
  );

  if (patientCheck.rows.length === 0) {
    res.status(403);
    throw new Error('You can only submit claims for your own family members');
  }

  // Determine claim type (mock logic for now based on UI)
  const claim_type = 'Outpatient Consultation';
  const billing_code = 'OUT-99213';

  // Insert claim
  const result = await pgclient.query(
    `INSERT INTO CLAIMS (patient_id, provider_id, claim_date, claim_type, billing_code, amount, status) 
     VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING *`,
    [patient_id, provider_id, claim_date, claim_type, billing_code, amount]
  );

  res.status(201).json(result.rows[0]);
});

module.exports = {
  getFamily,
  getProviders,
  requestPCP,
  getMedicalRecords,
  getClaims,
  getPCPHistory,
  submitCoverageRequest,
  getCoverageRequests,
  submitClaim,
};
