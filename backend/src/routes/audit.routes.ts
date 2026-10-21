import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.get('/', requireRole('SUPER_ADMIN'), getAuditLogs);

export default router;
