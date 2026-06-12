const asyncHandler = require('express-async-handler');
const pgclient = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');

/**
 * @desc    Get global dashboard stats for the admin portal
 * @route   GET /api/admin/dashboard
 * @access  Private (ADMIN)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [patients, providers, claims, pendingAssignments, pendingConsumers] = await Promise.all([
    pgclient.query('SELECT COUNT(*) FROM PATIENTS WHERE approval_status = $1', ['Approved']),
    pgclient.query('SELECT COUNT(*) FROM PROVIDERS'),
    pgclient.query('SELECT COUNT(*) FROM CLAIMS'),
    pgclient.query("SELECT COUNT(*) FROM PCP_ASSIGNMENTS WHERE status = 'Pending'"),
    pgclient.query("SELECT COUNT(*) FROM PATIENTS WHERE approval_status = 'Pending'"),
  ]);

  res.json({
    totalPatients: parseInt(patients.rows[0].count),
    totalProviders: parseInt(providers.rows[0].count),
    totalClaims: parseInt(claims.rows[0].count),
    pendingAssignments: parseInt(pendingAssignments.rows[0].count),
    pendingConsumers: parseInt(pendingConsumers.rows[0].count),
  });
});

/**
 * @desc    Get all pending consumer registrations
 * @route   GET /api/admin/pending-consumers
 * @access  Private (ADMIN)
 */
const getPendingConsumers = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT p.id, p.name, p.national_id, p.plan_type, p.relation, p.approval_status,
            u.email, u.created_at AS date_signed_up,
            (SELECT COUNT(*) FROM PATIENTS p2 WHERE p2.user_id = p.user_id) AS family_size
     FROM PATIENTS p
     JOIN USERS u ON u.id = p.user_id
     WHERE p.approval_status IN ('Pending', 'Flagged')
     ORDER BY u.created_at DESC`
  );

  res.json(result.rows);
});

/**
 * @desc    Approve or reject a consumer registration
 * @route   PUT /api/admin/approve-consumer/:patientId
 * @access  Private (ADMIN)
 */
const approveConsumer = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'

  if (!['Approved', 'Rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be Approved or Rejected');
  }

  const result = await pgclient.query(
    'UPDATE PATIENTS SET approval_status = $1 WHERE id = $2 RETURNING *',
    [status, patientId]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Patient not found');
  }

  // If approved, send welcome email
  if (status === 'Approved') {
    const userInfo = await pgclient.query(
      'SELECT u.email FROM USERS u JOIN PATIENTS p ON p.user_id = u.id WHERE p.id = $1',
      [patientId]
    );

    if (userInfo.rows.length > 0) {
      sendWelcomeEmail(
        userInfo.rows[0].email,
        result.rows[0].name,
        result.rows[0].plan_type
      ).catch(console.error);
    }
  }

  res.json(result.rows[0]);
});

/**
 * @desc    Get provider certifications pending review
 * @route   GET /api/admin/certifications
 * @access  Private (ADMIN)
 */
const getPendingCertifications = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT c.*, prov.name AS provider_name, prov.specialty, prov.clinic
     FROM CERTIFICATIONS c
     JOIN PROVIDERS prov ON prov.user_id = c.provider_id
     WHERE c.status IN ('Pending Review', 'Flagged')
     ORDER BY c.date_submitted DESC`
  );

  res.json(result.rows);
});

/**
 * @desc    Approve or flag a provider certification
 * @route   PUT /api/admin/certifications/:id
 * @access  Private (ADMIN)
 */
const updateCertification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Flagged'

  if (!['Approved', 'Flagged'].includes(status)) {
    res.status(400);
    throw new Error('Status must be Approved or Flagged');
  }

  const result = await pgclient.query(
    'UPDATE CERTIFICATIONS SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Certification not found');
  }

  res.json(result.rows[0]);
});

/**
 * @desc    Get all admin users
 * @route   GET /api/admin/admins
 * @access  Private (ADMIN)
 */
const getAdmins = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT a.*, u.email 
     FROM ADMINS a
     JOIN USERS u ON u.id = a.user_id
     ORDER BY a.name ASC`
  );

  res.json(result.rows);
});

/**
 * @desc    Get the full network provider directory
 * @route   GET /api/admin/providers
 * @access  Private (ADMIN)
 */
const getProviderDirectory = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT prov.*, u.email,
            (SELECT COUNT(*) FROM PCP_ASSIGNMENTS WHERE provider_id = prov.user_id AND status = 'Approved') AS active_patients,
            (SELECT status FROM CERTIFICATIONS WHERE provider_id = prov.user_id ORDER BY date_submitted DESC LIMIT 1) AS cert_status
     FROM PROVIDERS prov
     JOIN USERS u ON u.id = prov.user_id
     ORDER BY prov.name ASC`
  );

  res.json(result.rows);
});

/**
 * @desc    Get all coverage modification requests
 * @route   GET /api/admin/coverage-requests
 * @access  Private (ADMIN)
 */
const getCoverageRequests = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT cr.*, pat.name AS patient_name, u.email AS consumer_email
     FROM COVERAGE_REQUESTS cr
     JOIN PATIENTS pat ON pat.id = cr.patient_id
     JOIN USERS u ON u.id = cr.user_id
     ORDER BY cr.date_requested DESC`
  );
  res.json(result.rows);
});

/**
 * @desc    Approve or reject a coverage modification request
 * @route   PUT /api/admin/coverage-requests/:id
 * @access  Private (ADMIN)
 */
const updateCoverageRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    res.status(400);
    throw new Error('Status must be Approved or Rejected');
  }

  const result = await pgclient.query(
    `UPDATE COVERAGE_REQUESTS SET status = $1, admin_notes = $2, date_reviewed = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [status, admin_notes || null, id]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Coverage request not found');
  }

  // If approved, update the patient's plan_type
  if (status === 'Approved') {
    await pgclient.query(
      'UPDATE PATIENTS SET plan_type = $1 WHERE id = $2',
      [result.rows[0].requested_plan, result.rows[0].patient_id]
    );
  }

  res.json(result.rows[0]);
});

/**
 * @desc    Get all insurance companies
 * @route   GET /api/admin/insurance-companies
 * @access  Private (ADMIN)
 */
const getInsuranceCompanies = asyncHandler(async (req, res) => {
  const result = await pgclient.query('SELECT * FROM INSURANCE_COMPANIES ORDER BY name ASC');
  res.json(result.rows);
});

/**
 * @desc    Get all provider networks (mappings)
 * @route   GET /api/admin/provider-networks
 * @access  Private (ADMIN)
 */
const getProviderNetworks = asyncHandler(async (req, res) => {
  const result = await pgclient.query(`
    SELECT pn.provider_id, pn.company_id, pn.accepted_tier,
           p.name AS "providerName", p.specialty,
           ic.name AS "companyName"
    FROM PROVIDER_NETWORKS pn
    JOIN PROVIDERS p ON p.user_id = pn.provider_id
    JOIN INSURANCE_COMPANIES ic ON ic.id = pn.company_id
  `);
  res.json(result.rows);
});

/**
 * @desc    Assign provider to network
 * @route   POST /api/admin/provider-networks
 * @access  Private (ADMIN)
 */
const assignProviderToNetwork = asyncHandler(async (req, res) => {
  const { provider_id, company_id, accepted_tier } = req.body;

  if (!provider_id || !company_id || !accepted_tier) {
    res.status(400);
    throw new Error('Please provide provider_id, company_id, and accepted_tier');
  }

  // Check if mapping exists
  const exists = await pgclient.query(
    'SELECT * FROM PROVIDER_NETWORKS WHERE provider_id = $1 AND company_id = $2',
    [provider_id, company_id]
  );

  if (exists.rows.length > 0) {
    res.status(400);
    throw new Error('Provider is already assigned to this network. Please unassign first if you wish to change the tier.');
  }

  await pgclient.query(
    'INSERT INTO PROVIDER_NETWORKS (provider_id, company_id, accepted_tier) VALUES ($1, $2, $3)',
    [provider_id, company_id, accepted_tier]
  );

  res.status(201).json({ message: 'Provider successfully assigned to network' });
});

/**
 * @desc    Remove provider from network
 * @route   DELETE /api/admin/provider-networks/:provider_id/:company_id
 * @access  Private (ADMIN)
 */
const removeProviderFromNetwork = asyncHandler(async (req, res) => {
  const { provider_id, company_id } = req.params;

  await pgclient.query(
    'DELETE FROM PROVIDER_NETWORKS WHERE provider_id = $1 AND company_id = $2',
    [provider_id, company_id]
  );

  res.json({ message: 'Provider successfully removed from network' });
});

/**
 * @desc    Get all consumers (patients)
 * @route   GET /api/admin/consumers
 * @access  Private (ADMIN)
 */
const getAllConsumers = asyncHandler(async (req, res) => {
  const result = await pgclient.query(`
    SELECT p.*, ic.name AS "insurance_company_name"
    FROM PATIENTS p
    LEFT JOIN INSURANCE_COMPANIES ic ON ic.id = p.insurance_company_id
    ORDER BY p.name ASC
  `);
  res.json(result.rows);
});

/**
 * @desc    Update consumer details
 * @route   PUT /api/admin/consumers/:id
 * @access  Private (ADMIN)
 */
const updateConsumerDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval_status, insurance_company_id, network_tier, plan_type } = req.body;

  const result = await pgclient.query(
    `UPDATE PATIENTS 
     SET approval_status = COALESCE($1, approval_status),
         insurance_company_id = COALESCE($2, insurance_company_id),
         network_tier = COALESCE($3, network_tier),
         plan_type = COALESCE($4, plan_type)
     WHERE id = $5 
     RETURNING *`,
    [approval_status, insurance_company_id || null, network_tier, plan_type, id]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Consumer not found');
  }

  res.json(result.rows[0]);
});

/**
 * @desc    Get all claims
 * @route   GET /api/admin/claims
 * @access  Private (ADMIN)
 */
const getAllClaims = asyncHandler(async (req, res) => {
  const result = await pgclient.query(
    `SELECT c.*, p.name AS patient_name, pr.name AS provider_name
     FROM CLAIMS c
     JOIN PATIENTS p ON c.patient_id = p.id
     JOIN PROVIDERS pr ON c.provider_id = pr.user_id
     ORDER BY c.claim_date DESC`
  );
  res.json(result.rows);
});

/**
 * @desc    Approve or Deny a claim (Admin step)
 * @route   PUT /api/admin/claims/:id/process
 * @access  Private (ADMIN)
 */
const processClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expect 'Paid' or 'Rejected'

  if (!['Paid', 'Rejected'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status update. Must be "Paid" or "Rejected"');
  }

  const result = await pgclient.query(
    `UPDATE CLAIMS SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );

  if (result.rows.length === 0) {
    res.status(404);
    throw new Error('Claim not found');
  }

  res.json(result.rows[0]);
});

module.exports = {
  getAdmins,
  getProviderDirectory,
  getCoverageRequests,
  updateCoverageRequest,
  getInsuranceCompanies,
  getProviderNetworks,
  assignProviderToNetwork,
  removeProviderFromNetwork,
  getAllConsumers,
  updateConsumerDetails,
  getAllClaims,
  processClaim
};
