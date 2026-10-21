import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  roleName: string;
  roleLevel: number;
  establishmentId: string | null;
  groupementId: string | null;
  compagnieId: string | null;
  studentId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      res.status(401).json({ error: 'Non authentifié. Token de session manquant.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: true,
        studentProfile: { select: { id: true } },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Utilisateur inactif ou introuvable.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleCode: user.role.code,
      roleName: user.role.name,
      roleLevel: user.role.level,
      establishmentId: user.establishmentId,
      groupementId: user.groupementId,
      compagnieId: user.compagnieId,
      studentId: user.studentProfile?.id,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Session invalide ou expirée.' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    if (req.user.roleCode === 'SUPER_ADMIN') {
      return next(); // Super admin has global bypass for authorized endpoints
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      res.status(403).json({
        error: 'Accès refusé. Vos autorisations ne vous permettent pas d’effectuer cette action.',
        requiredRoles: allowedRoles,
        currentRole: req.user.roleCode,
      });
      return;
    }

    next();
  };
};

// Check if user has access to a specific hierarchy scope
export const verifyHierarchyScope = (
  user: AuthenticatedUser,
  scope: {
    establishmentId?: string | null;
    groupementId?: string | null;
    compagnieId?: string | null;
    studentId?: string | null;
  }
): boolean => {
  // Super admin or ERG general admin
  if (['SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
    return true;
  }

  // Establishment Director
  if (user.roleCode === 'ESTABLISHMENT_DIRECTOR') {
    if (scope.establishmentId && scope.establishmentId !== user.establishmentId) {
      return false;
    }
    return true;
  }

  // Groupement level
  if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode)) {
    if (scope.establishmentId && scope.establishmentId !== user.establishmentId) {
      return false;
    }
    if (scope.groupementId && scope.groupementId !== user.groupementId) {
      return false;
    }
    return true;
  }

  // Compagnie level
  if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode)) {
    if (scope.establishmentId && scope.establishmentId !== user.establishmentId) {
      return false;
    }
    if (scope.groupementId && scope.groupementId !== user.groupementId) {
      return false;
    }
    if (scope.compagnieId && scope.compagnieId !== user.compagnieId) {
      return false;
    }
    return true;
  }

  // Student level
  if (user.roleCode === 'STUDENT') {
    if (scope.studentId && scope.studentId !== user.studentId) {
      return false;
    }
    return true;
  }

  return false;
};
