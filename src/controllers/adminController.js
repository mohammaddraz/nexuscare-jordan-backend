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

module.exports = {
  getDashboardStats,
  getPendingConsumers,
  approveConsumer,
  getPendingCertifications,
  updateCertification,
  getAdmins,
  getProviderDirectory,
  getCoverageRequests,
  updateCoverageRequest,
};
