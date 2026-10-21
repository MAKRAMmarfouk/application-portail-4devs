import { Router } from 'express';
import {
  getCompagnies,
  createCompagnie,
  updateCompagnie,
} from '../controllers/compagnie.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getCompagnies);
router.post('/', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), createCompagnie);
router.put('/:id', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), updateCompagnie);

export default router;
