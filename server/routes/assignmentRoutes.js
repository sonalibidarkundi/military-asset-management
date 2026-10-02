import express from 'express';
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  returnAssignment,
} from '../controllers/assignmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.post('/', authorizeRoles('admin', 'logistics_officer', 'base_commander'), createAssignment);
router.put('/:id/return', authorizeRoles('admin', 'logistics_officer', 'base_commander'), returnAssignment);

export default router;
