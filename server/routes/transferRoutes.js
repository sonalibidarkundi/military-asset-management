import express from 'express';
import { getTransfers, createTransfer } from '../controllers/transferController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getTransfers);
router.post('/', authorizeRoles('admin', 'logistics_officer', 'base_commander'), createTransfer);

export default router;
