const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getPendingAssignments,
  updateAssignmentStatus,
  getMyPatients,
  submitClinicalLog,
  submitClaim,
  verifyCoverage,
  getMyClinicalLogs,
  getProviderClaims,
  verifyClaim
} = require('../controllers/providerController');

// All provider routes require authentication + PROVIDER role
router.use(protect);
router.use(authorize('PROVIDER'));

// GET /api/providers/assignments
router.get('/assignments', getPendingAssignments);

// PUT /api/providers/assignments/:id
router.put('/assignments/:id', updateAssignmentStatus);

// GET /api/providers/patients
router.get('/patients', getMyPatients);

// GET /api/providers/clinical-logs
router.get('/clinical-logs', getMyClinicalLogs);

// POST /api/providers/clinical-log
router.post('/clinical-log', submitClinicalLog);

// POST /api/providers/claims
router.post('/claims', submitClaim);

// GET /api/providers/verify/:nationalId
router.get('/verify/:nationalId', verifyCoverage);

// GET /api/providers/claims
router.get('/claims', getProviderClaims);

// PUT /api/providers/claims/:id/verify
router.put('/claims/:id/verify', verifyClaim);

module.exports = router;
