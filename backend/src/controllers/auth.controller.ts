import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe obligatoire'),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation échouée', details: parseResult.error.format() });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        establishment: { select: { id: true, code: true, name: true } },
        groupement: { select: { id: true, code: true, name: true } },
        compagnie: { select: { id: true, code: true, name: true } },
        studentProfile: { select: { id: true, matricule: true, status: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Identifiants invalides ou compte inactif.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { userId: user.id, role: user.role.code },
      secret,
      { expiresIn: '7d' }
    );

    // HttpOnly Cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAuditEvent(req, 'CONNEXION_REUSSIE', 'AUTH', { email: user.email, role: user.role.code });

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule || user.studentProfile?.matricule,
        role: {
          code: user.role.code,
          name: user.role.name,
          level: user.role.level,
        },
        establishment: user.establishment,
        groupement: user.groupement,
        compagnie: user.compagnie,
        studentProfile: user.studentProfile,
      },
    });
  } catch (error) {
    console.error('Erreur login :', error);
    res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion.' });
  }
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
        establishment: true,
        groupement: true,
        compagnie: true,
        studentProfile: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        matricule: user.matricule || user.studentProfile?.matricule,
        phone: user.phone,
        role: {
          code: user.role.code,
          name: user.role.name,
          level: user.role.level,
        },
        establishment: user.establishment,
        groupement: user.groupement,
        compagnie: user.compagnie,
        studentProfile: user.studentProfile,
      },
      unreadNotificationsCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('auth_token');
  if (req.user) {
    await logAuditEvent(req, 'DECONNEXION', 'AUTH', { userId: req.user.id });
  }
  res.json({ message: 'Déconnexion réussie.' });
};

export const getDemoAccounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'superadmin@ecoles.gov',
            'directeur.erg@ecoles.gov',
            'secretaire.erg@ecoles.gov',
            'directeur.sigr@ecoles.gov',
            'directeur.cfgr@ecoles.gov',
            'resp.group1@sigr.gov',
            'sec.group1@sigr.gov',
            'resp.cie1@sigr.gov',
            'sec.cie1@sigr.gov',
            'eleve.amara@sigr.gov',
          ],
        },
      },
      include: {
        role: true,
        establishment: true,
        groupement: true,
        compagnie: true,
      },
      orderBy: { role: { level: 'desc' } },
    });

    res.json(demoUsers.map(u => ({
      email: u.email,
      name: `${u.firstName} ${u.lastName}`,
      roleCode: u.role.code,
      roleName: u.role.name,
      establishment: u.establishment?.name || 'Administration Centrale',
      groupement: u.groupement?.name || null,
      compagnie: u.compagnie?.name || null,
      password: u.email === 'superadmin@ecoles.gov' ? 'admin123' : 'password123',
    })));
  } catch (error) {
    res.status(500).json({ error: 'Impossible de charger les comptes démo.' });
  }
};
