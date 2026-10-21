import { Router } from 'express';
import {
  getGroupements,
  createGroupement,
  updateGroupement,
} from '../controllers/groupement.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getGroupements);
router.post('/', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), createGroupement);
router.put('/:id', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), updateGroupement);

export default router;
