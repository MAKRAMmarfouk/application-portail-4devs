import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const studentSchema = z.object({
  matricule: z.string().min(3),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F']).default('M'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  status: z.enum(['ACTIF', 'MALADE', 'DETACHE', 'EN_PERMISSION', 'EXCLU', 'RADIE', 'DIPLOME']).default('ACTIF'),
  promotionYear: z.string().default('2026'),
  establishmentId: z.string().uuid(),
  groupementId: z.string().uuid(),
  compagnieId: z.string().uuid(),
});

export const getStudents = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      search,
      status,
      establishmentId,
      groupementId,
      compagnieId,
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};

    // Enforce hierarchical isolation
    if (user.roleCode === 'STUDENT') {
      if (user.studentId) {
        whereClause.id = user.studentId;
      } else {
        res.json({ data: [], total: 0, page: 1, limit: limitNum });
        return;
      }
    } else if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode)) {
      whereClause.compagnieId = user.compagnieId;
    } else if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode)) {
      whereClause.groupementId = user.groupementId;
    } else if (user.roleCode === 'ESTABLISHMENT_DIRECTOR') {
      whereClause.establishmentId = user.establishmentId;
    } else {
      // ERG and SUPER_ADMIN can filter freely
      if (establishmentId) whereClause.establishmentId = String(establishmentId);
      if (groupementId) whereClause.groupementId = String(groupementId);
      if (compagnieId) whereClause.compagnieId = String(compagnieId);
    }

    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }

    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { matricule: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ];
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where: whereClause }),
      prisma.student.findMany({
        where: whereClause,
        include: {
          establishment: { select: { id: true, code: true, name: true } },
          groupement: { select: { id: true, code: true, name: true } },
          compagnie: { select: { id: true, code: true, name: true } },
          _count: {
            select: {
              absences: true,
              grades: true,
              requests: true,
            },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      data: students,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des élèves.' });
  }
};

export const getStudentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        establishment: true,
        groupement: true,
        compagnie: true,
        requests: {
          include: { requestType: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        absences: {
          orderBy: { startDate: 'desc' },
          take: 10,
        },
        grades: {
          include: {
            assessment: {
              include: { subject: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!student) {
      res.status(404).json({ error: 'Élève introuvable.' });
      return;
    }

    // Access check
    if (user.roleCode === 'STUDENT' && user.studentId !== student.id) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode) && user.compagnieId !== student.compagnieId) {
      res.status(403).json({ error: 'Cet élève n’appartient pas à votre compagnie.' });
      return;
    }
    if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode) && user.groupementId !== student.groupementId) {
      res.status(403).json({ error: 'Cet élève n’appartient pas à votre groupement.' });
      return;
    }
    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== student.establishmentId) {
      res.status(403).json({ error: 'Cet élève n’appartient pas à votre établissement.' });
      return;
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la fiche élève.' });
  }
};

export const createStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = studentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const {
      matricule,
      firstName,
      lastName,
      dateOfBirth,
      placeOfBirth,
      gender,
      phone,
      email,
      address,
      status,
      promotionYear,
      establishmentId,
      groupementId,
      compagnieId,
    } = parseResult.data;

    // Check unique matricule
    const existing = await prisma.student.findUnique({ where: { matricule } });
    if (existing) {
      res.status(409).json({ error: `Le matricule ${matricule} est déjà attribué.` });
      return;
    }

    // Verify hierarchy consistency!
    const cie = await prisma.compagnie.findUnique({
      where: { id: compagnieId },
      include: { groupement: true },
    });

    if (!cie || cie.groupementId !== groupementId || cie.groupement.establishmentId !== establishmentId) {
      res.status(400).json({
        error: 'Incohérence hiérarchique : La compagnie, le groupement et l’établissement ne concordent pas.',
      });
      return;
    }

    const student = await prisma.student.create({
      data: {
        matricule,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        placeOfBirth,
        gender,
        phone,
        email,
        address,
        status,
        promotionYear,
        establishmentId,
        groupementId,
        compagnieId,
      },
      include: {
        establishment: true,
        groupement: true,
        compagnie: true,
      },
    });

    await logAuditEvent(req, 'CREATION_ELEVE', 'STUDENTS', {
      studentId: student.id,
      matricule: student.matricule,
      compagnieId: student.compagnieId,
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l’élève.' });
  }
};

export const updateStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const current = await prisma.student.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Élève introuvable.' });
      return;
    }

    // Role perimeter
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode) && user.compagnieId !== current.compagnieId) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }

    const data = { ...req.body };
    if (data.dateOfBirth) {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }

    const updated = await prisma.student.update({
      where: { id },
      data,
      include: {
        establishment: true,
        groupement: true,
        compagnie: true,
      },
    });

    await logAuditEvent(req, 'MODIFICATION_ELEVE', 'STUDENTS', {
      id: updated.id,
      matricule: updated.matricule,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l’élève.' });
  }
};
