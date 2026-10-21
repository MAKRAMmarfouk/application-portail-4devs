import { Router } from 'express';
import { getUsers, getRoles, createUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'), getUsers);
router.get('/roles', getRoles);
router.post('/', requireRole('SUPER_ADMIN'), createUser);
router.patch('/:id/toggle-status', requireRole('SUPER_ADMIN'), toggleUserStatus);

export default router;
