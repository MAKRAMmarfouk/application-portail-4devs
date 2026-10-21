import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const groupementSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  establishmentId: z.string().uuid(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const getGroupements = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { establishmentId } = req.query;

    let whereClause: any = {};

    if (!['SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
      if (user.establishmentId) {
        whereClause.establishmentId = user.establishmentId;
      }
      if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode) && user.groupementId) {
        whereClause.id = user.groupementId;
      }
    } else if (establishmentId) {
      whereClause.establishmentId = String(establishmentId);
    }

    const groupements = await prisma.groupement.findMany({
      where: whereClause,
      include: {
        establishment: { select: { id: true, code: true, name: true } },
        _count: {
          select: {
            compagnies: true,
            students: true,
          },
        },
        compagnies: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            _count: { select: { students: true } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json(groupements);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des groupements.' });
  }
};

export const createGroupement = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = groupementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const user = req.user!;
    // Director of establishment can only create for their own establishment
    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== parseResult.data.establishmentId) {
      res.status(403).json({ error: 'Vous ne pouvez créer un groupement que dans votre propre établissement.' });
      return;
    }

    const existing = await prisma.groupement.findFirst({
      where: {
        establishmentId: parseResult.data.establishmentId,
        code: parseResult.data.code,
      },
    });

    if (existing) {
      res.status(409).json({ error: `Le code ${parseResult.data.code} existe déjà dans cet établissement.` });
      return;
    }

    const groupement = await prisma.groupement.create({
      data: parseResult.data,
      include: { establishment: { select: { code: true, name: true } } },
    });

    await logAuditEvent(req, 'CREATION_GROUPEMENT', 'HIERARCHY', {
      groupementId: groupement.id,
      code: groupement.code,
      establishmentId: groupement.establishmentId,
    });

    res.status(201).json(groupement);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du groupement.' });
  }
};

export const updateGroupement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const current = await prisma.groupement.findUnique({ where: { id } });
    if (!current) {
      res.status(404).json({ error: 'Groupement introuvable.' });
      return;
    }

    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== current.establishmentId) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }

    const updated = await prisma.groupement.update({
      where: { id },
      data: req.body,
    });

    await logAuditEvent(req, 'MODIFICATION_GROUPEMENT', 'HIERARCHY', { id, code: updated.code });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du groupement.' });
  }
};
