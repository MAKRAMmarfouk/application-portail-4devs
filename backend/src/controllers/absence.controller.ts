import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const absenceSchema = z.object({
  studentId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  durationHours: z.number().int().min(1).default(4),
  type: z.enum(['JUSTIFIEE', 'INJUSTIFIEE', 'MEDICALE', 'MISSION', 'PERMISSION']).default('INJUSTIFIEE'),
  reason: z.string().optional(),
  isJustified: z.boolean().default(false),
  justification: z.string().optional(),
});

export const getAbsences = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { studentId, type, startDate, endDate, isJustified, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};

    if (user.roleCode === 'STUDENT') {
      if (user.studentId) {
        whereClause.studentId = user.studentId;
      } else {
        res.json({ data: [], total: 0 });
        return;
      }
    } else if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode)) {
      whereClause.compagnieId = user.compagnieId;
    } else if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode)) {
      whereClause.groupementId = user.groupementId;
    } else if (user.roleCode === 'ESTABLISHMENT_DIRECTOR') {
      whereClause.establishmentId = user.establishmentId;
    }

    if (studentId) whereClause.studentId = String(studentId);
    if (type && type !== 'ALL') whereClause.type = String(type);
    if (isJustified !== undefined && isJustified !== 'ALL') {
      whereClause.isJustified = isJustified === 'true';
    }

    if (startDate || endDate) {
      whereClause.startDate = {};
      if (startDate) whereClause.startDate.gte = new Date(String(startDate));
      if (endDate) whereClause.startDate.lte = new Date(String(endDate));
    }

    const [total, absences] = await Promise.all([
      prisma.absence.count({ where: whereClause }),
      prisma.absence.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              compagnie: { select: { code: true, name: true } },
            },
          },
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      data: absences,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des absences.' });
  }
};

export const createAbsence = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = absenceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const user = req.user!;
    const { studentId, startDate, endDate, durationHours, type, reason, isJustified, justification } = parseResult.data;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      res.status(404).json({ error: 'Élève introuvable.' });
      return;
    }

    // Role check: Chef Secrétaire Compagnie, Super Admin, Direction
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode) && user.compagnieId !== student.compagnieId) {
      res.status(403).json({ error: 'Cet élève ne relève pas de votre compagnie.' });
      return;
    }

    const absence = await prisma.absence.create({
      data: {
        studentId: student.id,
        establishmentId: student.establishmentId,
        groupementId: student.groupementId,
        compagnieId: student.compagnieId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        durationHours,
        type,
        reason,
        isJustified,
        justification,
        recordedById: user.id,
      },
      include: {
        student: true,
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await logAuditEvent(req, 'ENREGISTREMENT_ABSENCE', 'ABSENCES', {
      absenceId: absence.id,
      studentId: student.id,
      hours: durationHours,
    });

    res.status(201).json(absence);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l’enregistrement de l’absence.' });
  }
};

export const updateAbsence = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const current = await prisma.absence.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Absence introuvable.' });
      return;
    }

    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode) && user.compagnieId !== current.compagnieId) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }

    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updated = await prisma.absence.update({
      where: { id },
      data,
      include: { student: true, recordedBy: true },
    });

    await logAuditEvent(req, 'MODIFICATION_ABSENCE', 'ABSENCES', { id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification de l’absence.' });
  }
};
