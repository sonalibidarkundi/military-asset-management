import express from 'express';
import { getReportSummary } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/summary', getReportSummary);

export default router;
