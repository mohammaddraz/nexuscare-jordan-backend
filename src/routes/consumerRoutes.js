const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getFamily,
  getProviders,
  requestPCP,
  getMedicalRecords,
  getClaims,
  getPCPHistory,
  submitCoverageRequest,
  getCoverageRequests,
  submitClaim
} = require('../controllers/consumerController');

// All consumer routes require authentication + CONSUMER role
router.use(protect);
router.use(authorize('CONSUMER'));

// GET /api/consumers/family
router.get('/family', getFamily);

// GET /api/consumers/providers?city=Amman&specialty=Cardiology&accepting_new=true
router.get('/providers', getProviders);

// POST /api/consumers/pcp-request
router.post('/pcp-request', requestPCP);

// GET /api/consumers/pcp-history
router.get('/pcp-history', getPCPHistory);

// GET /api/consumers/records/:patientId
router.get('/records/:patientId', getMedicalRecords);

// GET /api/consumers/claims/:patientId
router.get('/claims/:patientId', getClaims);

// POST /api/consumers/coverage-request
router.post('/coverage-request', submitCoverageRequest);

// GET /api/consumers/coverage-requests
router.get('/coverage-requests', getCoverageRequests);

// POST /api/consumers/claims
router.post('/claims', submitClaim);

module.exports = router;
