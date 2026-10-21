import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    // 1. Super Admin
    if (user.roleCode === 'SUPER_ADMIN') {
      const [
        establishmentsCount,
        usersCount,
        groupementsCount,
        compagniesCount,
        studentsCount,
        requestsCount,
        pendingRequestsCount,
        recentAudits,
        requestsByStatusRaw,
        studentsByEstablishment,
      ] = await Promise.all([
        prisma.establishment.count(),
        prisma.user.count(),
        prisma.groupement.count(),
        prisma.compagnie.count(),
        prisma.student.count(),
        prisma.administrativeRequest.count(),
        prisma.administrativeRequest.count({
          where: { status: { notIn: ['VALIDEE_DEFINITIVEMENT', 'REFUSEE', 'ANNULEE'] } },
        }),
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        }),
        prisma.administrativeRequest.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        prisma.establishment.findMany({
          select: {
            code: true,
            name: true,
            _count: { select: { students: true } },
          },
        }),
      ]);

      res.json({
        role: 'SUPER_ADMIN',
        metrics: {
          establishments: establishmentsCount,
          users: usersCount,
          groupements: groupementsCount,
          compagnies: compagniesCount,
          students: studentsCount,
          totalRequests: requestsCount,
          pendingRequests: pendingRequestsCount,
        },
        requestsByStatus: requestsByStatusRaw.map(r => ({ status: r.status, count: r._count.status })),
        distribution: studentsByEstablishment.map(e => ({ name: e.code, students: e._count.students })),
        recentAudits,
      });
      return;
    }

    // 2. Gestion ERG (Directeur / Secrétaire)
    if (['ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user.roleCode)) {
      const [
        establishments,
        totalStudents,
        requestsByStatusRaw,
        pendingDecisionsCount,
        recentRequests,
        averageGradesByEstablishment,
      ] = await Promise.all([
        prisma.establishment.findMany({
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            _count: { select: { groupements: true, students: true, requests: true } },
          },
        }),
        prisma.student.count(),
        prisma.administrativeRequest.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        prisma.administrativeRequest.count({
          where: { currentStep: { in: ['SECRETARIAT_ERG', 'DIRECTEUR_ERG'] } },
        }),
        prisma.administrativeRequest.findMany({
          take: 6,
          orderBy: { updatedAt: 'desc' },
          include: {
            requestType: true,
            student: { select: { firstName: true, lastName: true, matricule: true } },
            establishment: { select: { code: true } },
          },
        }),
        prisma.grade.aggregate({
          where: { status: 'VALIDEE' },
          _avg: { score: true },
        }),
      ]);

      res.json({
        role: user.roleCode,
        metrics: {
          totalEstablishments: establishments.length,
          totalStudents,
          pendingDecisions: pendingDecisionsCount,
          overallAverageGrade: averageGradesByEstablishment._avg.score?.toFixed(2) || 'N/A',
        },
        establishments,
        requestsByStatus: requestsByStatusRaw.map(r => ({ status: r.status, count: r._count.status })),
        recentRequests,
      });
      return;
    }

    // 3. Directeur d'Établissement (SIGR, CFGR, EFQGR)
    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR') {
      const establishmentId = user.establishmentId!;
      const [
        establishment,
        totalStudents,
        groupementsCount,
        compagniesCount,
        pendingDirectionCount,
        recentAbsencesCount,
        requestsByStatusRaw,
        groupementsDetails,
      ] = await Promise.all([
        prisma.establishment.findUnique({
          where: { id: establishmentId },
          select: { id: true, code: true, name: true },
        }),
        prisma.student.count({ where: { establishmentId } }),
        prisma.groupement.count({ where: { establishmentId } }),
        prisma.compagnie.count({ where: { groupement: { establishmentId } } }),
        prisma.administrativeRequest.count({
          where: { establishmentId, currentStep: 'DIRECTION_ECOLE' },
        }),
        prisma.absence.count({ where: { establishmentId } }),
        prisma.administrativeRequest.groupBy({
          by: ['status'],
          where: { establishmentId },
          _count: { status: true },
        }),
        prisma.groupement.findMany({
          where: { establishmentId },
          select: {
            id: true,
            code: true,
            name: true,
            _count: { select: { compagnies: true, students: true } },
          },
        }),
      ]);

      res.json({
        role: 'ESTABLISHMENT_DIRECTOR',
        establishment,
        metrics: {
          totalStudents,
          groupements: groupementsCount,
          compagnies: compagniesCount,
          pendingDirectionValidation: pendingDirectionCount,
          totalAbsences: recentAbsencesCount,
        },
        requestsByStatus: requestsByStatusRaw.map(r => ({ status: r.status, count: r._count.status })),
        groupements: groupementsDetails,
      });
      return;
    }

    // 4. Groupement (Responsable / Secrétaire)
    if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode)) {
      const groupementId = user.groupementId!;
      const [
        groupement,
        totalStudents,
        compagnies,
        pendingRequestsCount,
        absencesCount,
      ] = await Promise.all([
        prisma.groupement.findUnique({
          where: { id: groupementId },
          include: { establishment: true },
        }),
        prisma.student.count({ where: { groupementId } }),
        prisma.compagnie.findMany({
          where: { groupementId },
          include: { _count: { select: { students: true, requests: true } } },
        }),
        prisma.administrativeRequest.count({
          where: {
            groupementId,
            currentStep: { in: ['SECRETARIAT_GROUPEMENT', 'RESPONSABLE_GROUPEMENT'] },
          },
        }),
        prisma.absence.count({ where: { groupementId } }),
      ]);

      res.json({
        role: user.roleCode,
        groupement,
        metrics: {
          totalStudents,
          totalCompagnies: compagnies.length,
          pendingValidation: pendingRequestsCount,
          totalAbsences: absencesCount,
        },
        compagnies,
      });
      return;
    }

    // 5. Compagnie (Responsable / Chef Secrétaire)
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode)) {
      const compagnieId = user.compagnieId!;
      const [
        compagnie,
        totalStudents,
        pendingRequestsCount,
        pendingGradesCount,
        absencesCount,
        recentRequests,
      ] = await Promise.all([
        prisma.compagnie.findUnique({
          where: { id: compagnieId },
          include: { groupement: { include: { establishment: true } } },
        }),
        prisma.student.count({ where: { compagnieId } }),
        prisma.administrativeRequest.count({
          where: {
            compagnieId,
            currentStep: { in: ['SECRETARIAT_COMPAGNIE', 'RESPONSABLE_COMPAGNIE'] },
          },
        }),
        prisma.grade.count({
          where: { assessment: { compagnieId }, status: 'SAISIE' },
        }),
        prisma.absence.count({ where: { compagnieId } }),
        prisma.administrativeRequest.findMany({
          where: { compagnieId },
          take: 5,
          orderBy: { updatedAt: 'desc' },
          include: {
            requestType: true,
            student: { select: { firstName: true, lastName: true, matricule: true } },
          },
        }),
      ]);

      res.json({
        role: user.roleCode,
        compagnie,
        metrics: {
          totalStudents,
          pendingRequests: pendingRequestsCount,
          pendingGrades: pendingGradesCount,
          totalAbsences: absencesCount,
        },
        recentRequests,
      });
      return;
    }

    // 6. Élève
    if (user.roleCode === 'STUDENT') {
      const studentId = user.studentId;
      if (!studentId) {
        res.json({ role: 'STUDENT', metrics: {} });
        return;
      }

      const [student, requests, absences, grades] = await Promise.all([
        prisma.student.findUnique({
          where: { id: studentId },
          include: { establishment: true, groupement: true, compagnie: true },
        }),
        prisma.administrativeRequest.findMany({
          where: { studentId },
          include: { requestType: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.absence.findMany({
          where: { studentId },
          orderBy: { startDate: 'desc' },
        }),
        prisma.grade.findMany({
          where: { studentId, status: { in: ['VALIDEE', 'PUBLIEE'] } },
          include: { assessment: { include: { subject: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      res.json({
        role: 'STUDENT',
        student,
        requests,
        absences,
        grades,
        metrics: {
          totalRequests: requests.length,
          pendingRequests: requests.filter(r => !['VALIDEE_DEFINITIVEMENT', 'REFUSEE'].includes(r.status)).length,
          totalAbsences: absences.length,
          validatedGradesCount: grades.length,
        },
      });
      return;
    }

    res.json({ role: user.roleCode, message: 'Dashboard par défaut' });
  } catch (error) {
    console.error('Erreur dashboard stats :', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques.' });
  }
};
