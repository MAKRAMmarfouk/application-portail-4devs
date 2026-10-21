import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  roleCode: z.string(),
  matricule: z.string().optional(),
  phone: z.string().optional(),
  establishmentId: z.string().uuid().optional().nullable(),
  groupementId: z.string().uuid().optional().nullable(),
  compagnieId: z.string().uuid().optional().nullable(),
});

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let whereClause: any = {};

    if (user.roleCode !== 'SUPER_ADMIN') {
      if (user.establishmentId) {
        whereClause.establishmentId = user.establishmentId;
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        matricule: true,
        phone: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        role: { select: { id: true, code: true, name: true, level: true } },
        establishment: { select: { id: true, code: true, name: true } },
        groupement: { select: { id: true, code: true, name: true } },
        compagnie: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

export const getRoles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { level: 'desc' },
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des rôles.' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = userCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const {
      email,
      password,
      firstName,
      lastName,
      roleCode,
      matricule,
      phone,
      establishmentId,
      groupementId,
      compagnieId,
    } = parseResult.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      res.status(409).json({ error: 'Cette adresse email est déjà utilisée.' });
      return;
    }

    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      res.status(400).json({ error: 'Rôle sélectionné inexistant.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        matricule,
        phone,
        roleId: role.id,
        establishmentId,
        groupementId,
        compagnieId,
      },
      include: { role: true, establishment: true, groupement: true, compagnie: true },
    });

    await logAuditEvent(req, 'CREATION_UTILISATEUR', 'USERS', {
      userId: newUser.id,
      email: newUser.email,
      role: role.code,
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du compte.' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !target.isActive },
    });

    await logAuditEvent(req, 'MODIFICATION_STATUT_UTILISATEUR', 'USERS', {
      userId: id,
      newActiveState: updated.isActive,
    });

    res.json({ message: 'Statut mis à jour.', isActive: updated.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la modification du statut.' });
  }
};
