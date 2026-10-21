import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const assessmentSchema = z.object({
  title: z.string().min(3),
  type: z.enum(['EXAMEN', 'CONTROLE', 'TP', 'EPREUVE_SPORTIVE', 'DISCIPLINE']).default('CONTROLE'),
  date: z.string(),
  maxScore: z.number().default(20),
  coefficient: z.number().default(1),
  subjectId: z.string().uuid(),
  compagnieId: z.string().uuid(),
});

const saveGradeSchema = z.object({
  assessmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.number().min(0).max(100),
  comments: z.string().optional(),
  modificationReason: z.string().optional(),
});

export const getSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let whereClause: any = {};
    if (user.establishmentId) {
      whereClause.establishmentId = user.establishmentId;
    }
    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: { establishment: { select: { code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des matières.' });
  }
};

export const getAssessments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { compagnieId } = req.query;

    let whereClause: any = {};
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode)) {
      whereClause.compagnieId = user.compagnieId;
    } else if (compagnieId) {
      whereClause.compagnieId = String(compagnieId);
    }

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        subject: true,
        compagnie: { select: { id: true, code: true, name: true } },
        _count: { select: { grades: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des évaluations.' });
  }
};

export const createAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = assessmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const assessment = await prisma.assessment.create({
      data: {
        ...parseResult.data,
        date: new Date(parseResult.data.date),
      },
      include: { subject: true, compagnie: true },
    });

    await logAuditEvent(req, 'CREATION_EVALUATION', 'GRADES', {
      assessmentId: assessment.id,
      title: assessment.title,
    });

    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l’évaluation.' });
  }
};

export const getGradesByAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assessmentId } = req.params;

    const grades = await prisma.grade.findMany({
      where: { assessmentId },
      include: {
        student: {
          select: {
            id: true,
            matricule: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
        validatedBy: { select: { firstName: true, lastName: true } },
        history: {
          include: {
            modifiedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { student: { lastName: 'asc' } },
    });

    res.json(grades);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des notes.' });
  }
};

export const saveGrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = saveGradeSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Données de note invalides', details: parseResult.error.format() });
      return;
    }

    const { assessmentId, studentId, score, comments, modificationReason } = parseResult.data;

    // Check existing
    const existing = await prisma.grade.findUnique({
      where: { assessmentId_studentId: { assessmentId, studentId } },
    });

    if (existing) {
      // If grade is already validated and user is not Director/Admin, prevent silent alteration!
      if (existing.status === 'VALIDEE' && !['SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR'].includes(user.roleCode)) {
        res.status(403).json({
          error: 'Cette note a déjà été validée par la Direction. Une modification requiert les droits de Direction.',
        });
        return;
      }

      // Record in GradeHistory
      if (existing.score !== score) {
        await prisma.gradeHistory.create({
          data: {
            gradeId: existing.id,
            previousScore: existing.score,
            newScore: score,
            modifiedById: user.id,
            reason: modificationReason || 'Rectification de note',
          },
        });
      }

      const updated = await prisma.grade.update({
        where: { id: existing.id },
        data: {
          score,
          comments,
          // if modified, reset to SAISIE if not updated by Director
          status: user.roleCode === 'ESTABLISHMENT_DIRECTOR' ? 'VALIDEE' : 'SAISIE',
        },
        include: { student: true },
      });

      await logAuditEvent(req, 'MODIFICATION_NOTE', 'GRADES', {
        gradeId: updated.id,
        previousScore: existing.score,
        newScore: score,
      });

      res.json(updated);
    } else {
      // Create new grade
      const created = await prisma.grade.create({
        data: {
          assessmentId,
          studentId,
          score,
          comments,
          status: 'SAISIE',
          createdById: user.id,
        },
        include: { student: true },
      });

      await logAuditEvent(req, 'SAISIE_NOTE', 'GRADES', {
        gradeId: created.id,
        studentId,
        score,
      });

      res.status(201).json(created);
    }
  } catch (error) {
    console.error('Erreur saveGrade :', error);
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de la note.' });
  }
};

export const submitGradesForValidation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assessmentId } = req.params;
    const user = req.user!;

    await prisma.grade.updateMany({
      where: { assessmentId, status: 'SAISIE' },
      data: { status: 'SOUMIS_VALIDATION' },
    });

    await logAuditEvent(req, 'SOUMISSION_NOTES_VALIDATION', 'GRADES', { assessmentId });
    res.json({ message: 'Les notes ont été transmises à la Direction pour validation.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la transmission des notes.' });
  }
};

export const validateGrades = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assessmentId } = req.params;
    const user = req.user!;

    if (!['SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'ERG_DIRECTOR'].includes(user.roleCode)) {
      res.status(403).json({ error: 'Seule la Direction est autorisée à valider définitivement les notes.' });
      return;
    }

    await prisma.grade.updateMany({
      where: { assessmentId },
      data: {
        status: 'VALIDEE',
        validatedById: user.id,
        validatedAt: new Date(),
      },
    });

    await logAuditEvent(req, 'VALIDATION_NOTES_DIRECTION', 'GRADES', { assessmentId });
    res.json({ message: 'Notes validées par la Direction avec succès.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la validation des notes.' });
  }
};
