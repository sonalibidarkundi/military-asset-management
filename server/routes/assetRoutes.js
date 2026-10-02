import express from 'express';
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from '../controllers/assetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAssets);
router.get('/:id', getAssetById);
router.post('/', authorizeRoles('admin', 'logistics_officer', 'base_commander'), createAsset);
router.put('/:id', authorizeRoles('admin', 'logistics_officer', 'base_commander'), updateAsset);
router.delete('/:id', authorizeRoles('admin'), deleteAsset);

export default router;
