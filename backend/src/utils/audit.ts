import { Request } from 'express';
import { prisma } from '../config/prisma';

export async function logAuditEvent(
  req: Request,
  action: string,
  module: string,
  details?: Record<string, any>
) {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = req.user?.id || null;
    const userRole = req.user?.roleCode || 'ANONYMOUS';

    await prisma.auditLog.create({
      data: {
        userId,
        userRole,
        action,
        module,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Erreur lors de l’enregistrement de l’audit :', err);
  }
}
