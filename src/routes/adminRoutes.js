const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getDashboardStats,
  getPendingConsumers,
  approveConsumer,
  getPendingCertifications,
  updateCertification,
  getAdmins,
  getProviderDirectory,
  updateProviderDetails,
  getCoverageRequests,
  updateCoverageRequest,
  getInsuranceCompanies,
  getProviderNetworks,
  assignProviderToNetwork,
  removeProviderFromNetwork,
  getAllConsumers,
  updateConsumerDetails,
  getAllClaims,
  processClaim,
  addAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/adminController');

// All admin routes require authentication + ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', getDashboardStats);

// GET /api/admin/pending-consumers
router.get('/pending-consumers', getPendingConsumers);

// PUT /api/admin/approve-consumer/:patientId
router.put('/approve-consumer/:patientId', approveConsumer);

// GET /api/admin/certifications
router.get('/certifications', getPendingCertifications);

// PUT /api/admin/certifications/:id
router.put('/certifications/:id', updateCertification);

// GET /api/admin/admins
router.get('/admins', getAdmins);

// POST /api/admin/admins
router.post('/admins', addAdmin);

// PUT /api/admin/admins/:id
router.put('/admins/:id', updateAdmin);

// DELETE /api/admin/admins/:id
router.delete('/admins/:id', deleteAdmin);

// GET /api/admin/providers
router.get('/providers', getProviderDirectory);

// PUT /api/admin/providers/:id
router.put('/providers/:id', updateProviderDetails);

// GET /api/admin/coverage-requests
router.get('/coverage-requests', getCoverageRequests);

// PUT /api/admin/coverage-requests/:id
router.put('/coverage-requests/:id', updateCoverageRequest);

// GET /api/admin/insurance-companies
router.get('/insurance-companies', getInsuranceCompanies);

// GET /api/admin/provider-networks
router.get('/provider-networks', getProviderNetworks);

// POST /api/admin/provider-networks
router.post('/provider-networks', assignProviderToNetwork);

// DELETE /api/admin/provider-networks/:provider_id/:company_id
router.delete('/provider-networks/:provider_id/:company_id', removeProviderFromNetwork);

// GET /api/admin/consumers
router.get('/consumers', getAllConsumers);

// PUT /api/admin/consumers/:id
router.put('/consumers/:id', updateConsumerDetails);

// GET /api/admin/claims
router.get('/claims', getAllClaims);

// PUT /api/admin/claims/:id/process
router.put('/claims/:id/process', processClaim);

module.exports = router;
