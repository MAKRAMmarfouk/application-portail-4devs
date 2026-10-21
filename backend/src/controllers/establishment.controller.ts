import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const establishmentSchema = z.object({
  code: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(3),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const getEstablishments = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let whereClause: any = {};

    // Isolation rules
    if (!['SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
      if (user.establishmentId) {
        whereClause.id = user.establishmentId;
      } else {
        res.json([]);
        return;
      }
    }

    const establishments = await prisma.establishment.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            groupements: true,
            students: true,
            requests: true,
          },
        },
        groupements: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
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
                _count: {
                  select: { students: true },
                },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    res.json(establishments);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des établissements.' });
  }
};

export const getEstablishmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!['SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
      if (user.establishmentId !== id) {
        res.status(403).json({ error: 'Accès non autorisé à cet établissement.' });
        return;
      }
    }

    const establishment = await prisma.establishment.findUnique({
      where: { id },
      include: {
        groupements: {
          include: {
            compagnies: {
              include: {
                _count: { select: { students: true } },
              },
            },
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
    });

    if (!establishment) {
      res.status(404).json({ error: 'Établissement introuvable.' });
      return;
    }

    res.json(establishment);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de l’établissement.' });
  }
};

export const createEstablishment = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = establishmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const existing = await prisma.establishment.findUnique({
      where: { code: parseResult.data.code },
    });
    if (existing) {
      res.status(409).json({ error: `Le code d’établissement ${parseResult.data.code} existe déjà.` });
      return;
    }

    const establishment = await prisma.establishment.create({
      data: parseResult.data,
    });

    await logAuditEvent(req, 'CREATION_ETABLISSEMENT', 'ESTABLISHMENT', {
      code: establishment.code,
      name: establishment.name,
    });

    res.status(201).json(establishment);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l’établissement.' });
  }
};

export const updateEstablishment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!['SUPER_ADMIN', 'ERG_DIRECTOR'].includes(user.roleCode)) {
      if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && user.establishmentId !== id) {
        res.status(403).json({ error: 'Vous ne pouvez modifier que votre propre établissement.' });
        return;
      }
    }

    const updated = await prisma.establishment.update({
      where: { id },
      data: req.body,
    });

    await logAuditEvent(req, 'MODIFICATION_ETABLISSEMENT', 'ESTABLISHMENT', { id, code: updated.code });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l’établissement.' });
  }
};
