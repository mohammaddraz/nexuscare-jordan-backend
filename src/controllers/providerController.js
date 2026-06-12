const asyncHandler = require('express-async-handler');
const pgclient = require('../config/db');
const { sendPCPStatusEmail } = require('../services/emailService');

/**
 * @desc    Get pending PCP assignments for this provider
 * @route   GET /api/providers/assignments
 * @access  Private (PROVIDER)
 */
const getPendingAssignments = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT pca.*, 
            pat.name AS patient_name, 
            pat.relation, 
            pat.plan_type,
            pat.national_id
     FROM PCP_ASSIGNMENTS pca
     JOIN PATIENTS pat ON pat.id = pca.patient_id
     WHERE pca.provider_id = $1 AND pca.status = 'Pending'
     ORDER BY pca.date_requested ASC`,
    [req.user.id]
  );

  res.json(result.rows);
});

/**
 * @desc    Approve or reject a PCP assignment
 * @route   PUT /api/providers/assignments/:id
 * @access  Private (PROVIDER)
 */
const updateAssignmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be Approved or Rejected');
  }

  // Verify the assignment belongs to this provider
  const assignmentCheck = await pgclient.query(
    'SELECT * FROM PCP_ASSIGNMENTS WHERE id = $1 AND provider_id = $2',
    [id, req.user.id]
  );

  if (assignmentCheck.rows.length === 0) {
    res.status(404);
    throw new Error('Assignment not found or not yours');
  }

  // Update the status
  const result = await pgclient.query(
    'UPDATE PCP_ASSIGNMENTS SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  // Get patient + consumer email for notification
  const patientInfo = await pgclient.query(
    `SELECT pat.name AS patient_name, u.email 
     FROM PATIENTS pat
     JOIN USERS u ON u.id = pat.user_id
     WHERE pat.id = $1`,
    [assignmentCheck.rows[0].patient_id]
  );

  // Get provider name
  const providerInfo = await pgclient.query(
    'SELECT name FROM PROVIDERS WHERE user_id = $1',
    [req.user.id]
  );

  // Send email notification (non-blocking)
  if (patientInfo.rows.length > 0 && providerInfo.rows.length > 0) {
    sendPCPStatusEmail(
      patientInfo.rows[0].email,
      patientInfo.rows[0].patient_name,
      providerInfo.rows[0].name,
      status
    ).catch(console.error);
  }

  res.json(result.rows[0]);
});

/**
 * @desc    Get all patients assigned to this provider
 * @route   GET /api/providers/patients
 * @access  Private (PROVIDER)
 */
const getMyPatients = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT pat.*, pca.status AS assignment_status, pca.date_requested
     FROM PCP_ASSIGNMENTS pca
     JOIN PATIENTS pat ON pat.id = pca.patient_id
     WHERE pca.provider_id = $1 AND pca.status = 'Approved'
     ORDER BY pat.name ASC`,
    [req.user.id]
  );

  res.json(result.rows);
});

/**
 * @desc    Submit a clinical log (medical record) for a patient
 * @route   POST /api/providers/clinical-log
 * @access  Private (PROVIDER)
 */
const submitClinicalLog = asyncHandler(async (req, res) => {
  const { patient_id, diagnosis, icd_code, prescription, notes } = req.body;

  if (!patient_id || !diagnosis) {
    res.status(400);
    throw new Error('Patient ID and diagnosis are required');
  }

  // Verify this patient is assigned to this provider
  const check = await pgclient.query(
    `SELECT id FROM PCP_ASSIGNMENTS 
     WHERE patient_id = $1 AND provider_id = $2 AND status = 'Approved'`,
    [patient_id, req.user.id]
  );

  if (check.rows.length === 0) {
    res.status(403);
    throw new Error('Patient is not assigned to you');
  }

  const result = await pgclient.query(
    `INSERT INTO MEDICAL_RECORDS (patient_id, provider_id, record_date, diagnosis, icd_code, prescription, notes)
     VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6) RETURNING *`,
    [patient_id, req.user.id, diagnosis, icd_code, prescription, notes]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @desc    Submit a billing claim for a patient
 * @route   POST /api/providers/claims
 * @access  Private (PROVIDER)
 */
const submitClaim = asyncHandler(async (req, res) => {
  const { patient_id, claim_type, billing_code, amount, deductible_applied } = req.body;

  if (!patient_id || !amount) {
    res.status(400);
    throw new Error('Patient ID and amount are required');
  }

  const result = await pgclient.query(
    `INSERT INTO CLAIMS (patient_id, provider_id, claim_date, claim_type, billing_code, amount, deductible_applied)
     VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6) RETURNING *`,
    [patient_id, req.user.id, claim_type, billing_code, amount, deductible_applied || 0]
  );

  res.status(201).json(result.rows[0]);
});

/**
 * @desc    Verify patient coverage by national ID
 * @route   GET /api/providers/verify/:nationalId
 * @access  Private (PROVIDER)
 */
const verifyCoverage = asyncHandler(async (req, res) => {
  const { nationalId } = req.params;

  const result = await pgclient.query(
    `SELECT name, plan_type, approval_status 
     FROM PATIENTS 
     WHERE national_id = $1`,
    [nationalId]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Patient not found');
  }

  res.json(result.rows[0]);
});

module.exports = {
  getPendingAssignments,
  updateAssignmentStatus,
  getMyPatients,
  submitClinicalLog,
  submitClaim,
  verifyCoverage,
};
