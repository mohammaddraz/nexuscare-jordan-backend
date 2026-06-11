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

// GET /api/admin/providers
router.get('/providers', getProviderDirectory);

module.exports = router;
