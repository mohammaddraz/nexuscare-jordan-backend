const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  getPendingAssignments,
  updateAssignmentStatus,
  getMyPatients,
  submitClinicalLog,
  submitClaim,
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

// POST /api/providers/clinical-log
router.post('/clinical-log', submitClinicalLog);

// POST /api/providers/claims
router.post('/claims', submitClaim);

module.exports = router;
