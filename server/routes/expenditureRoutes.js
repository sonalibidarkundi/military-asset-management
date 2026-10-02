import express from 'express';
import {
  getExpenditures,
  getExpenditureById,
  createExpenditure,
} from '../controllers/expenditureController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getExpenditures);
router.get('/:id', getExpenditureById);
router.post('/', authorizeRoles('admin', 'logistics_officer', 'base_commander'), createExpenditure);

export default router;
