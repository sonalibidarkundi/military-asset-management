import express from 'express';
import { getPurchases, getPurchaseById, createPurchase } from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', authorizeRoles('admin', 'logistics_officer'), createPurchase);

export default router;
