import { Router } from 'express';
import {
  getSubjects,
  getAssessments,
  createAssessment,
  getGradesByAssessment,
  saveGrade,
  submitGradesForValidation,
  validateGrades,
} from '../controllers/grade.controller';
import { authenticate, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/subjects', getSubjects);
router.get('/assessments', getAssessments);
router.post('/assessments', requireRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY', 'COMPAGNIE_RESPONSIBLE'), createAssessment);
router.get('/assessments/:assessmentId/grades', getGradesByAssessment);
router.post('/save', requireRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY'), saveGrade);
router.post('/assessments/:assessmentId/submit', requireRole('SUPER_ADMIN', 'COMPAGNIE_SECRETARY'), submitGradesForValidation);
router.post('/assessments/:assessmentId/validate', requireRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'ERG_DIRECTOR'), validateGrades);

export default router;
