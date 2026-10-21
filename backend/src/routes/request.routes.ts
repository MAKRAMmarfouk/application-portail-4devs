import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  executeWorkflowAction,
  getRequestTypes,
} from '../controllers/request.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/types', getRequestTypes);
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.post('/:id/action', executeWorkflowAction);

export default router;
