import { Router } from 'express';
import {
  getEstablishments,
  getEstablishmentById,
  createEstablishment,
  updateEstablishment,
} from '../controllers/establishment.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getEstablishments);
router.get('/:id', getEstablishmentById);
router.post('/', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR'), createEstablishment);
router.put('/:id', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), updateEstablishment);

export default router;
