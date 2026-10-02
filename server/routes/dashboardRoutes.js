import express from 'express';
import {
  getDashboardSummary,
  getDashboardMovement,
  getDashboardMovementDetails,
  getDashboardFilters,
} from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getDashboardSummary);
router.get('/movement', getDashboardMovement);
router.get('/movement-details', getDashboardMovementDetails);
router.get('/filters', getDashboardFilters);

export default router;
