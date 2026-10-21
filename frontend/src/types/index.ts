export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ERG_DIRECTOR'
  | 'ERG_SECRETARY'
  | 'ESTABLISHMENT_DIRECTOR'
  | 'GROUPEMENT_RESPONSIBLE'
  | 'GROUPEMENT_SECRETARY'
  | 'COMPAGNIE_RESPONSIBLE'
  | 'COMPAGNIE_SECRETARY'
  | 'STUDENT';

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
  level: number;
  description?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  matricule?: string;
  phone?: string;
  role: Role;
  establishmentId?: string | null;
  establishment?: { id: string; code: string; name: string } | null;
  groupementId?: string | null;
  groupement?: { id: string; code: string; name: string } | null;
  compagnieId?: string | null;
  compagnie?: { id: string; code: string; name: string } | null;
  studentId?: string | null;
  studentProfile?: { id: string; matricule: string; status: string } | null;
  isActive?: boolean;
}

export interface Establishment {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  groupements?: Groupement[];
  _count?: {
    groupements: number;
    students: number;
    requests: number;
    absences?: number;
  };
}

export interface Groupement {
  id: string;
  code: string;
  name: string;
  establishmentId: string;
  establishment?: Establishment;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  compagnies?: Compagnie[];
  _count?: {
    compagnies: number;
    students: number;
  };
}

export interface Compagnie {
  id: string;
  code: string;
  name: string;
  groupementId: string;
  groupement?: Groupement;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
  _count?: {
    students: number;
    requests?: number;
    absences?: number;
  };
}

export interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  gender: 'M' | 'F';
  phone?: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  status: 'ACTIF' | 'MALADE' | 'DETACHE' | 'EN_PERMISSION' | 'EXCLU' | 'RADIE' | 'DIPLOME';
  promotionYear?: string;
  establishmentId: string;
  establishment?: Establishment;
  groupementId: string;
  groupement?: Groupement;
  compagnieId: string;
  compagnie?: Compagnie;
  requests?: AdministrativeRequest[];
  absences?: Absence[];
  grades?: Grade[];
  _count?: {
    absences: number;
    grades: number;
    requests: number;
  };
}

export interface RequestType {
  id: string;
  code: string;
  name: string;
  description?: string;
  requiresGeneralAdmin: boolean;
}

export type RequestStatus =
  | 'BROUILLON'
  | 'SOUMISE'
  | 'RECUE_SECRETARIAT_COMPAGNIE'
  | 'VALIDEE_COMPAGNIE'
  | 'RECUE_SECRETARIAT_GROUPEMENT'
  | 'VALIDEE_GROUPEMENT'
  | 'VALIDEE_DIRECTION'
  | 'TRANSMIS_ERG'
  | 'VALIDEE_DEFINITIVEMENT'
  | 'REFUSEE'
  | 'RETOUR_CORRECTION'
  | 'ANNULEE';

export type WorkflowStep =
  | 'SECRETARIAT_COMPAGNIE'
  | 'RESPONSABLE_COMPAGNIE'
  | 'SECRETARIAT_GROUPEMENT'
  | 'RESPONSABLE_GROUPEMENT'
  | 'DIRECTION_ECOLE'
  | 'SECRETARIAT_ERG'
  | 'DIRECTEUR_ERG'
  | 'ELEVE'
  | 'CLOTUREE';

export interface RequestHistoryItem {
  id: string;
  requestId: string;
  actorId: string;
  actor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  actorRole: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  comments?: string;
  createdAt: string;
}

export interface AdministrativeRequest {
  id: string;
  trackingNumber: string;
  studentId: string;
  student: Student;
  establishmentId: string;
  establishment?: Establishment;
  groupementId: string;
  groupement?: Groupement;
  compagnieId: string;
  compagnie?: Compagnie;
  requestTypeId: string;
  requestType: RequestType;
  subject: string;
  content: string;
  startDate?: string;
  endDate?: string;
  destination?: string;
  status: RequestStatus;
  currentStep: WorkflowStep;
  rejectionReason?: string;
  correctionNotes?: string;
  attachments?: string;
  history?: RequestHistoryItem[];
  submittedAt: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Absence {
  id: string;
  studentId: string;
  student?: Student;
  establishmentId: string;
  groupementId: string;
  compagnieId: string;
  startDate: string;
  endDate: string;
  durationHours: number;
  type: 'JUSTIFIEE' | 'INJUSTIFIEE' | 'MEDICALE' | 'MISSION' | 'PERMISSION';
  reason?: string;
  isJustified: boolean;
  justification?: string;
  recordedById: string;
  recordedBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  coefficient: number;
  establishmentId: string;
  establishment?: Establishment;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'EXAMEN' | 'CONTROLE' | 'TP' | 'EPREUVE_SPORTIVE' | 'DISCIPLINE';
  date: string;
  maxScore: number;
  coefficient: number;
  subjectId: string;
  subject: Subject;
  compagnieId: string;
  compagnie?: Compagnie;
  _count?: { grades: number };
}

export interface Grade {
  id: string;
  assessmentId: string;
  assessment?: Assessment;
  studentId: string;
  student?: Student;
  score: number;
  comments?: string;
  status: 'SAISIE' | 'SOUMIS_VALIDATION' | 'VALIDEE' | 'PUBLIEE';
  createdById: string;
  createdBy?: { firstName: string; lastName: string };
  validatedById?: string;
  validatedBy?: { firstName: string; lastName: string };
  validatedAt?: string;
  history?: GradeHistoryItem[];
  createdAt: string;
}

export interface GradeHistoryItem {
  id: string;
  gradeId: string;
  previousScore: number;
  newScore: number;
  modifiedById: string;
  modifiedBy: { firstName: string; lastName: string };
  reason: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  user?: { id: string; email: string; firstName: string; lastName: string };
  userRole?: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}
