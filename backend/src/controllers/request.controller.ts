import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAuditEvent } from '../utils/audit';

const createRequestSchema = z.object({
  requestTypeId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  subject: z.string().min(3),
  content: z.string().min(10),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  destination: z.string().optional(),
  attachments: z.string().optional(), // JSON array
});

const actionSchema = z.object({
  action: z.enum([
    'TRANSMIT_TO_RESPONSABLE_CIE',
    'VALIDATE_CIE',
    'TRANSMIT_TO_RESPONSABLE_GROUP',
    'VALIDATE_GROUP',
    'VALIDATE_DIRECTION',
    'TRANSMIT_TO_DIRECTEUR_ERG',
    'VALIDATE_ERG',
    'REJECT',
    'RETURN_FOR_CORRECTION',
    'RESUBMIT',
  ]),
  comments: z.string().optional(),
  reason: z.string().optional(),
});

export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, type, search, currentStep, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};

    // Hierarchical perimeter isolation
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
    // ERG and SUPER_ADMIN see all (or filtered by query)

    if (status && status !== 'ALL') {
      whereClause.status = String(status);
    }
    if (currentStep && currentStep !== 'ALL') {
      whereClause.currentStep = String(currentStep);
    }
    if (type && type !== 'ALL') {
      whereClause.requestType = { code: String(type) };
    }
    if (search) {
      const q = String(search).trim();
      whereClause.OR = [
        { trackingNumber: { contains: q } },
        { subject: { contains: q } },
        { student: { lastName: { contains: q } } },
        { student: { firstName: { contains: q } } },
        { student: { matricule: { contains: q } } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.administrativeRequest.count({ where: whereClause }),
      prisma.administrativeRequest.findMany({
        where: whereClause,
        include: {
          requestType: true,
          student: {
            select: {
              id: true,
              matricule: true,
              firstName: true,
              lastName: true,
              gender: true,
              status: true,
            },
          },
          establishment: { select: { id: true, code: true, name: true } },
          groupement: { select: { id: true, code: true, name: true } },
          compagnie: { select: { id: true, code: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      data: requests,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes.' });
  }
};

export const getRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const requestItem = await prisma.administrativeRequest.findUnique({
      where: { id },
      include: {
        requestType: true,
        student: {
          include: {
            establishment: true,
            groupement: true,
            compagnie: true,
          },
        },
        establishment: true,
        groupement: true,
        compagnie: true,
        history: {
          include: {
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!requestItem) {
      res.status(404).json({ error: 'Demande administrative introuvable.' });
      return;
    }

    // Check perimeter
    if (user.roleCode === 'STUDENT' && requestItem.studentId !== user.studentId) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }
    if (['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user.roleCode) && requestItem.compagnieId !== user.compagnieId) {
      res.status(403).json({ error: 'Cette demande ne concerne pas votre compagnie.' });
      return;
    }
    if (['GROUPEMENT_RESPONSIBLE', 'GROUPEMENT_SECRETARY'].includes(user.roleCode) && requestItem.groupementId !== user.groupementId) {
      res.status(403).json({ error: 'Cette demande ne concerne pas votre groupement.' });
      return;
    }
    if (user.roleCode === 'ESTABLISHMENT_DIRECTOR' && requestItem.establishmentId !== user.establishmentId) {
      res.status(403).json({ error: 'Cette demande ne concerne pas votre établissement.' });
      return;
    }

    res.json(requestItem);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la demande.' });
  }
};

export const createRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Données invalides', details: parseResult.error.format() });
      return;
    }

    const user = req.user!;
    let targetStudentId = parseResult.data.studentId;

    if (user.roleCode === 'STUDENT') {
      if (!user.studentId) {
        res.status(400).json({ error: 'Profil élève introuvable pour ce compte.' });
        return;
      }
      targetStudentId = user.studentId;
    } else if (!targetStudentId) {
      res.status(400).json({ error: 'L’identifiant de l’élève est obligatoire.' });
      return;
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
    });

    if (!student) {
      res.status(404).json({ error: 'Élève introuvable.' });
      return;
    }

    // Generate tracking number REQ-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await prisma.administrativeRequest.count();
    const trackingNumber = `REQ-${currentYear}-${String(countThisYear + 1).padStart(4, '0')}`;

    const newRequest = await prisma.administrativeRequest.create({
      data: {
        trackingNumber,
        studentId: student.id,
        establishmentId: student.establishmentId,
        groupementId: student.groupementId,
        compagnieId: student.compagnieId,
        requestTypeId: parseResult.data.requestTypeId,
        subject: parseResult.data.subject,
        content: parseResult.data.content,
        startDate: parseResult.data.startDate ? new Date(parseResult.data.startDate) : null,
        endDate: parseResult.data.endDate ? new Date(parseResult.data.endDate) : null,
        destination: parseResult.data.destination,
        attachments: parseResult.data.attachments,
        status: 'SOUMISE',
        currentStep: 'SECRETARIAT_COMPAGNIE',
      },
    });

    // Record initial history
    await prisma.requestHistory.create({
      data: {
        requestId: newRequest.id,
        actorId: user.id,
        actorRole: user.roleCode,
        action: 'CREATION',
        previousStatus: 'BROUILLON',
        newStatus: 'SOUMISE',
        comments: 'Soumission initiale de la demande.',
      },
    });

    await logAuditEvent(req, 'DEPOT_DEMANDE', 'WORKFLOW', {
      requestId: newRequest.id,
      trackingNumber,
      studentId: student.id,
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Erreur createRequest :', error);
    res.status(500).json({ error: 'Erreur lors de la création de la demande.' });
  }
};

export const executeWorkflowAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const parseResult = actionSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Action invalide', details: parseResult.error.format() });
      return;
    }

    const { action, comments, reason } = parseResult.data;

    const requestItem = await prisma.administrativeRequest.findUnique({
      where: { id },
      include: {
        requestType: true,
        student: { include: { user: true } },
      },
    });

    if (!requestItem) {
      res.status(404).json({ error: 'Demande introuvable.' });
      return;
    }

    let newStatus = requestItem.status;
    let newStep = requestItem.currentStep;
    let closedAt: Date | null = requestItem.closedAt;
    let historyAction = 'VALIDATION';

    // Strict validation of actor role vs step
    switch (action) {
      // 1. Secrétaire de Compagnie transmet au Responsable de Compagnie
      case 'TRANSMIT_TO_RESPONSABLE_CIE':
        if (!['COMPAGNIE_SECRETARY', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Secrétaire de Compagnie.' });
          return;
        }
        if (requestItem.compagnieId !== user.compagnieId && user.roleCode !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Périmètre non autorisé.' });
          return;
        }
        newStatus = 'RECUE_SECRETARIAT_COMPAGNIE';
        newStep = 'RESPONSABLE_COMPAGNIE';
        historyAction = 'TRANSMISSION';
        break;

      // 2. Responsable de Compagnie valide -> transmet au Secrétariat Groupement
      case 'VALIDATE_CIE':
        if (!['COMPAGNIE_RESPONSIBLE', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Commandant / Responsable de Compagnie.' });
          return;
        }
        if (requestItem.compagnieId !== user.compagnieId && user.roleCode !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Périmètre non autorisé.' });
          return;
        }
        newStatus = 'VALIDEE_COMPAGNIE';
        newStep = 'SECRETARIAT_GROUPEMENT';
        historyAction = 'VALIDATION';
        break;

      // 3. Secrétaire de Groupement transmet au Responsable de Groupement
      case 'TRANSMIT_TO_RESPONSABLE_GROUP':
        if (!['GROUPEMENT_SECRETARY', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Secrétaire de Groupement.' });
          return;
        }
        if (requestItem.groupementId !== user.groupementId && user.roleCode !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Périmètre non autorisé.' });
          return;
        }
        newStatus = 'RECUE_SECRETARIAT_GROUPEMENT';
        newStep = 'RESPONSABLE_GROUPEMENT';
        historyAction = 'TRANSMISSION';
        break;

      // 4. Responsable de Groupement valide -> transmet à la Direction d'école
      case 'VALIDATE_GROUP':
        if (!['GROUPEMENT_RESPONSIBLE', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Chef de Groupement.' });
          return;
        }
        if (requestItem.groupementId !== user.groupementId && user.roleCode !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Périmètre non autorisé.' });
          return;
        }
        newStatus = 'VALIDEE_GROUPEMENT';
        newStep = 'DIRECTION_ECOLE';
        historyAction = 'VALIDATION';
        break;

      // 5. Direction d'école valide
      case 'VALIDATE_DIRECTION':
        if (!['ESTABLISHMENT_DIRECTOR', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Directeur d’Établissement.' });
          return;
        }
        if (requestItem.establishmentId !== user.establishmentId && user.roleCode !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Périmètre non autorisé.' });
          return;
        }

        // If request requires general admin ERG (e.g. Libération définitive)
        if (requestItem.requestType.requiresGeneralAdmin) {
          newStatus = 'TRANSMIS_ERG';
          newStep = 'SECRETARIAT_ERG';
          historyAction = 'TRANSMISSION';
        } else {
          newStatus = 'VALIDEE_DEFINITIVEMENT';
          newStep = 'CLOTUREE';
          closedAt = new Date();
          historyAction = 'VALIDATION';
        }
        break;

      // 6. Secrétaire ERG transmet au Directeur ERG
      case 'TRANSMIT_TO_DIRECTEUR_ERG':
        if (!['ERG_SECRETARY', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Secrétaire de Gestion ERG.' });
          return;
        }
        newStep = 'DIRECTEUR_ERG';
        historyAction = 'TRANSMISSION';
        break;

      // 7. Directeur ERG validation finale
      case 'VALIDATE_ERG':
        if (!['ERG_DIRECTOR', 'SUPER_ADMIN'].includes(user.roleCode)) {
          res.status(403).json({ error: 'Action réservée au Directeur de Gestion ERG.' });
          return;
        }
        newStatus = 'VALIDEE_DEFINITIVEMENT';
        newStep = 'CLOTUREE';
        closedAt = new Date();
        historyAction = 'VALIDATION';
        break;

      // REFUS : peut intervenir au niveau Responsable Cie, Responsable Groupement, Direction ou ERG
      case 'REJECT':
        if (!reason || reason.trim().length === 0) {
          res.status(400).json({ error: 'Le motif de refus est obligatoire pour toute décision de rejet.' });
          return;
        }
        newStatus = 'REFUSEE';
        newStep = 'CLOTUREE';
        closedAt = new Date();
        historyAction = 'REFUS';
        break;

      // RETOUR POUR CORRECTION
      case 'RETURN_FOR_CORRECTION':
        if (!comments || comments.trim().length === 0) {
          res.status(400).json({ error: 'Une note explicative est requise pour un retour pour correction.' });
          return;
        }
        newStatus = 'RETOUR_CORRECTION';
        newStep = 'ELEVE';
        historyAction = 'RETOUR';
        break;

      // RESOUMISSION PAR L'ELEVE APRES CORRECTION
      case 'RESUBMIT':
        if (user.roleCode === 'STUDENT' && requestItem.studentId !== user.studentId) {
          res.status(403).json({ error: 'Accès non autorisé.' });
          return;
        }
        newStatus = 'SOUMISE';
        newStep = 'SECRETARIAT_COMPAGNIE';
        historyAction = 'TRANSMISSION';
        break;

      default:
        res.status(400).json({ error: 'Action non reconnue.' });
        return;
    }

    // Apply transaction
    const [updatedRequest] = await prisma.$transaction([
      prisma.administrativeRequest.update({
        where: { id },
        data: {
          status: newStatus,
          currentStep: newStep,
          rejectionReason: action === 'REJECT' ? reason : requestItem.rejectionReason,
          correctionNotes: action === 'RETURN_FOR_CORRECTION' ? comments : requestItem.correctionNotes,
          closedAt,
        },
      }),
      prisma.requestHistory.create({
        data: {
          requestId: id,
          actorId: user.id,
          actorRole: user.roleCode,
          action: historyAction,
          previousStatus: requestItem.status,
          newStatus,
          comments: comments || reason || null,
        },
      }),
    ]);

    // Send notification to student if account exists
    if (requestItem.student.user?.id) {
      await prisma.notification.create({
        data: {
          userId: requestItem.student.user.id,
          title: `Mise à jour demande : ${requestItem.trackingNumber}`,
          message: `Votre demande est passée à l'état : ${newStatus}. Étape actuelle : ${newStep}.`,
          type: newStatus === 'VALIDEE_DEFINITIVEMENT' ? 'SUCCESS' : newStatus === 'REFUSEE' ? 'DANGER' : 'INFO',
          link: `/demandes/${requestItem.id}`,
        },
      });
    }

    await logAuditEvent(req, `ACTION_WORKFLOW_${action}`, 'WORKFLOW', {
      requestId: id,
      previousStatus: requestItem.status,
      newStatus,
      newStep,
    });

    res.json(updatedRequest);
  } catch (error) {
    console.error('Erreur workflow action :', error);
    res.status(500).json({ error: 'Erreur lors de l’exécution du workflow.' });
  }
};

export const getRequestTypes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.requestType.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des types de demandes.' });
  }
};
