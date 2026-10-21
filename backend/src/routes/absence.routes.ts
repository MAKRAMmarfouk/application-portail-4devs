import { Router } from 'express';
import {
  getAbsences,
  createAbsence,
  updateAbsence,
} from '../controllers/absence.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAbsences);
router.post(
  '/',
  requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY', 'COMPAGNIE_RESPONSIBLE'),
  createAbsence
);
router.put(
  '/:id',
  requireRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY'),
  updateAbsence
);

export default router;
