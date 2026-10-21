import { Router } from 'express';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
} from '../controllers/student.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getStudents);
router.get('/:id', getStudentById);
router.post(
  '/',
  requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY'),
  createStudent
);
router.put(
  '/:id',
  requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY'),
  updateStudent
);

export default router;
