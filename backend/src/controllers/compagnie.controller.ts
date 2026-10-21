import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const compagnieSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  groupementId: z.string().uuid(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const getCompagnies = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { groupementId, establishmentId } = req.query;

    let whereClause: any = {};

    if (!['SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
      if (user.compagnieId) {
        whereClause.id = user.compagnieId;
      } else if (user.groupementId) {
        whereClause.groupementId = user.groupementId;
      } else if (user.establishmentId) {
        whereClause.groupement = { establishmentId: user.establishmentId };
      }
    } else {
      if (groupementId) {
        whereClause.groupementId = String(groupementId);
      } else if (establishmentId) {
        whereClause.groupement = { establishmentId: String(establishmentId) };
      }
    }

    const compagnies = await prisma.compagnie.findMany({
      where: whereClause,
      include: {
        groupement: {
          select: {
            id: true,
            code: true,
            name: true,
            establishment: { select: { id: true, code: true, name: true } },
          },
        },
        _count: {
          select: {
            students: true,
            requests: true,
            absences: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json(compagnies);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des compagnies.' });
  }
};

export const createCompagnie = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = compagnieSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const user = req.user!;
    const groupement = await prisma.groupement.findUnique({
      where: { id: parseResult.data.groupementId },
    });

    if (!groupement) {
      res.status(404).json({ error: 'Groupement parent introuvable.' });
      return;
    }

    // Check establishment isolation
    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== groupement.establishmentId) {
      res.status(403).json({ error: 'Vous ne pouvez pas créer une compagnie rattachée à un groupement d’un autre établissement.' });
      return;
    }

    const existing = await prisma.compagnie.findFirst({
      where: {
        groupementId: parseResult.data.groupementId,
        code: parseResult.data.code,
      },
    });

    if (existing) {
      res.status(409).json({ error: `La compagnie avec le code ${parseResult.data.code} existe déjà dans ce groupement.` });
      return;
    }

    const compagnie = await prisma.compagnie.create({
      data: parseResult.data,
      include: { groupement: true },
    });

    await logAuditEvent(req, 'CREATION_COMPAGNIE', 'HIERARCHY', {
      compagnieId: compagnie.id,
      code: compagnie.code,
      groupementId: compagnie.groupementId,
    });

    res.status(201).json(compagnie);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la compagnie.' });
  }
};

export const updateCompagnie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const current = await prisma.compagnie.findUnique({
      where: { id },
      include: { groupement: true },
    });

    if (!current) {
      res.status(404).json({ error: 'Compagnie introuvable.' });
      return;
    }

    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== current.groupement.establishmentId) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }

    const updated = await prisma.compagnie.update({
      where: { id },
      data: req.body,
    });

    await logAuditEvent(req, 'MODIFICATION_COMPAGNIE', 'HIERARCHY', { id, code: updated.code });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la compagnie.' });
  }
};
