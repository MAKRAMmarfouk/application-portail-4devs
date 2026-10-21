import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Initialisation du Seeding de la Base de Données ---');

  // 1. Roles
  const rolesData = [
    { code: 'SUPER_ADMIN', name: 'Super Administrateur', level: 100, description: 'Administration système globale et gestion des droits' },
    { code: 'ERG_DIRECTOR', name: 'Directeur Gestion ERG', level: 90, description: 'Directeur de l’administration générale ERG' },
    { code: 'ERG_SECRETARY', name: 'Secrétaire Gestion ERG', level: 85, description: 'Secrétaire de l’administration générale ERG' },
    { code: 'ESTABLISHMENT_DIRECTOR', name: 'Directeur d’Établissement', level: 80, description: 'Direction d’une école (SIGR, CFGR, EFQGR)' },
    { code: 'GROUPEMENT_RESPONSIBLE', name: 'Responsable de Groupement', level: 60, description: 'Commandant / Chef de Groupement' },
    { code: 'GROUPEMENT_SECRETARY', name: 'Secrétaire de Groupement', level: 55, description: 'Secrétariat administratif du Groupement' },
    { code: 'COMPAGNIE_RESPONSIBLE', name: 'Responsable de Compagnie', level: 40, description: 'Commandant / Chef de Compagnie' },
    { code: 'COMPAGNIE_SECRETARY', name: 'Chef Secrétaire de Compagnie', level: 35, description: 'Secrétariat et gestion des élèves, notes et absences' },
    { code: 'STUDENT', name: 'Élève', level: 10, description: 'Élève en formation' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, level: r.level, description: r.description },
      create: r,
    });
    roleMap[r.code] = role.id;
  }
  console.log('✓ Rôles créés ou synchronisés.');

  // 2. Request Types
  const requestTypesData = [
    { code: 'PERMISSION', name: 'Demande de permission exceptionnelle', description: 'Autorisation de sortie ou dispense temporaire', requiresGeneralAdmin: false },
    { code: 'LIBERATION', name: 'Demande de libération définitive', description: 'Départ ou libération du cycle de formation', requiresGeneralAdmin: true },
    { code: 'DECLARATION', name: 'Déclaration administrative', description: 'Déclaration formelle d’incident, de perte ou de situation personnelle', requiresGeneralAdmin: false },
    { code: 'COMPTE_RENDU', name: 'Compte rendu d’activité', description: 'Rapport hiérarchique sur un événement ou une mission', requiresGeneralAdmin: false },
    { code: 'RECLAMATION', name: 'Réclamation administrative', description: 'Recours ou réclamation concernant une note ou décision', requiresGeneralAdmin: false },
  ];

  const reqTypeMap: Record<string, string> = {};
  for (const rt of requestTypesData) {
    const type = await prisma.requestType.upsert({
      where: { code: rt.code },
      update: { name: rt.name, description: rt.description, requiresGeneralAdmin: rt.requiresGeneralAdmin },
      create: rt,
    });
    reqTypeMap[rt.code] = type.id;
  }
  console.log('✓ Types de demandes initialisés.');

  // 3. Establishments
  const estabSIGR = await prisma.establishment.upsert({
    where: { code: 'SIGR' },
    update: { name: "Section d'Instruction Générale Régionale", status: 'ACTIVE' },
    create: {
      code: 'SIGR',
      name: "Section d'Instruction Générale Régionale",
      address: 'Avenue de la Formation Militaire, Région Centre',
      phone: '+33 1 40 50 60 70',
      email: 'contact@sigr.defense.gouv',
      status: 'ACTIVE',
      description: "Établissement principal d'instruction générale et d'intégration initiale.",
    },
  });

  const estabCFGR = await prisma.establishment.upsert({
    where: { code: 'CFGR' },
    update: { name: "Centre de Formation et de Perfectionnement Général Régional", status: 'ACTIVE' },
    create: {
      code: 'CFGR',
      name: "Centre de Formation et de Perfectionnement Général Régional",
      address: 'Route Nationale 12, Pôle d’Excellence',
      phone: '+33 2 40 50 60 71',
      email: 'contact@cfgr.defense.gouv',
      status: 'ACTIVE',
      description: "Centre de perfectionnement des cadres et officiers d'administration.",
    },
  });

  const estabEFQGR = await prisma.establishment.upsert({
    where: { code: 'EFQGR' },
    update: { name: "École de Formation et de Qualification Générale Régionale", status: 'ACTIVE' },
    create: {
      code: 'EFQGR',
      name: "École de Formation et de Qualification Générale Régionale",
      address: 'Boulevard de la Qualification Technique, Base Sud',
      phone: '+33 4 40 50 60 72',
      email: 'contact@efqgr.defense.gouv',
      status: 'ACTIVE',
      description: "École supérieure de qualification technique et d'aptitude tactique.",
    },
  });
  console.log('✓ Établissements créés (SIGR, CFGR, EFQGR).');

  // 4. Groupements
  const grp1SIGR = await prisma.groupement.upsert({
    where: { establishmentId_code: { establishmentId: estabSIGR.id, code: 'GRP-1' } },
    update: { name: "1er Groupement d'Instruction SIGR" },
    create: {
      name: "1er Groupement d'Instruction SIGR",
      code: 'GRP-1',
      establishmentId: estabSIGR.id,
      description: "Groupement chargé de la formation initiale des promotions d'entrée.",
    },
  });

  const grp2SIGR = await prisma.groupement.upsert({
    where: { establishmentId_code: { establishmentId: estabSIGR.id, code: 'GRP-2' } },
    update: { name: "2ème Groupement d'Instruction SIGR" },
    create: {
      name: "2ème Groupement d'Instruction SIGR",
      code: 'GRP-2',
      establishmentId: estabSIGR.id,
      description: "Groupement d'instruction avancée et de spécialisation.",
    },
  });

  const grp1CFGR = await prisma.groupement.upsert({
    where: { establishmentId_code: { establishmentId: estabCFGR.id, code: 'GRP-1' } },
    update: { name: "1er Groupement de Perfectionnement CFGR" },
    create: {
      name: "1er Groupement de Perfectionnement CFGR",
      code: 'GRP-1',
      establishmentId: estabCFGR.id,
      description: "Groupement des officiers élèves et stagiaires supérieurs.",
    },
  });
  console.log('✓ Groupements créés.');

  // 5. Compagnies
  const cie1 = await prisma.compagnie.upsert({
    where: { groupementId_code: { groupementId: grp1SIGR.id, code: 'CIE-1' } },
    update: { name: "1ère Compagnie d'Élèves (SIGR)" },
    create: {
      name: "1ère Compagnie d'Élèves (SIGR)",
      code: 'CIE-1',
      groupementId: grp1SIGR.id,
      description: "Compagnie d'élite Alpha — Promotion 2026.",
    },
  });

  const cie2 = await prisma.compagnie.upsert({
    where: { groupementId_code: { groupementId: grp1SIGR.id, code: 'CIE-2' } },
    update: { name: "2ème Compagnie d'Élèves (SIGR)" },
    create: {
      name: "2ème Compagnie d'Élèves (SIGR)",
      code: 'CIE-2',
      groupementId: grp1SIGR.id,
      description: "Compagnie Bravo — Promotion 2026.",
    },
  });

  const cie3 = await prisma.compagnie.upsert({
    where: { groupementId_code: { groupementId: grp2SIGR.id, code: 'CIE-3' } },
    update: { name: "3ème Compagnie d'Élèves (SIGR)" },
    create: {
      name: "3ème Compagnie d'Élèves (SIGR)",
      code: 'CIE-3',
      groupementId: grp2SIGR.id,
      description: "Compagnie Charlie — Spécialisation technique.",
    },
  });

  const cieCFGR1 = await prisma.compagnie.upsert({
    where: { groupementId_code: { groupementId: grp1CFGR.id, code: 'CIE-1' } },
    update: { name: "1ère Compagnie de Cadres (CFGR)" },
    create: {
      name: "1ère Compagnie de Cadres (CFGR)",
      code: 'CIE-1',
      groupementId: grp1CFGR.id,
      description: "Cadres stagiaires en perfectionnement.",
    },
  });
  console.log('✓ Compagnies créées.');

  // 6. Users (with bcrypt hash)
  const passwordHash = await bcrypt.hash('password123', 10);
  const superAdminPasswordHash = await bcrypt.hash('admin123', 10);

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@ecoles.gov' },
    update: {},
    create: {
      email: 'superadmin@ecoles.gov',
      passwordHash: superAdminPasswordHash,
      firstName: 'Alexandre',
      lastName: 'DUBOIS',
      roleId: roleMap['SUPER_ADMIN'],
      isActive: true,
      phone: '+33 6 00 11 22 33',
    },
  });

  // Gestion ERG
  await prisma.user.upsert({
    where: { email: 'directeur.erg@ecoles.gov' },
    update: {},
    create: {
      email: 'directeur.erg@ecoles.gov',
      passwordHash,
      firstName: 'Général Henri',
      lastName: 'DE MONTCLAR',
      roleId: roleMap['ERG_DIRECTOR'],
      isActive: true,
      phone: '+33 6 01 22 33 44',
    },
  });

  await prisma.user.upsert({
    where: { email: 'secretaire.erg@ecoles.gov' },
    update: {},
    create: {
      email: 'secretaire.erg@ecoles.gov',
      passwordHash,
      firstName: 'Marie',
      lastName: 'LAMBERT',
      roleId: roleMap['ERG_SECRETARY'],
      isActive: true,
      phone: '+33 6 02 33 44 55',
    },
  });

  // Directeur SIGR
  await prisma.user.upsert({
    where: { email: 'directeur.sigr@ecoles.gov' },
    update: {},
    create: {
      email: 'directeur.sigr@ecoles.gov',
      passwordHash,
      firstName: 'Colonel François',
      lastName: 'VALENTIN',
      roleId: roleMap['ESTABLISHMENT_DIRECTOR'],
      establishmentId: estabSIGR.id,
      isActive: true,
      phone: '+33 6 11 22 33 44',
    },
  });

  // Directeur CFGR
  await prisma.user.upsert({
    where: { email: 'directeur.cfgr@ecoles.gov' },
    update: {},
    create: {
      email: 'directeur.cfgr@ecoles.gov',
      passwordHash,
      firstName: 'Colonel Marc',
      lastName: 'BERNARD',
      roleId: roleMap['ESTABLISHMENT_DIRECTOR'],
      establishmentId: estabCFGR.id,
      isActive: true,
      phone: '+33 6 12 22 33 55',
    },
  });

  // Responsable Groupement 1 SIGR
  await prisma.user.upsert({
    where: { email: 'resp.group1@sigr.gov' },
    update: {},
    create: {
      email: 'resp.group1@sigr.gov',
      passwordHash,
      firstName: 'Commandant Pierre',
      lastName: 'MOREAU',
      roleId: roleMap['GROUPEMENT_RESPONSIBLE'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      isActive: true,
      phone: '+33 6 22 33 44 55',
    },
  });

  // Secrétaire Groupement 1 SIGR
  await prisma.user.upsert({
    where: { email: 'sec.group1@sigr.gov' },
    update: {},
    create: {
      email: 'sec.group1@sigr.gov',
      passwordHash,
      firstName: 'Adjudant-Chef Claire',
      lastName: 'FOURNIER',
      roleId: roleMap['GROUPEMENT_SECRETARY'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      isActive: true,
      phone: '+33 6 33 44 55 66',
    },
  });

  // Responsable Compagnie 1 SIGR
  await prisma.user.upsert({
    where: { email: 'resp.cie1@sigr.gov' },
    update: {},
    create: {
      email: 'resp.cie1@sigr.gov',
      passwordHash,
      firstName: 'Capitaine Julien',
      lastName: 'MERCIER',
      roleId: roleMap['COMPAGNIE_RESPONSIBLE'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      isActive: true,
      phone: '+33 6 44 55 66 77',
    },
  });

  // Chef Secrétaire Compagnie 1 SIGR
  await prisma.user.upsert({
    where: { email: 'sec.cie1@sigr.gov' },
    update: {},
    create: {
      email: 'sec.cie1@sigr.gov',
      passwordHash,
      firstName: 'Sergent-Chef Thomas',
      lastName: 'ROUX',
      roleId: roleMap['COMPAGNIE_SECRETARY'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      isActive: true,
      phone: '+33 6 55 66 77 88',
    },
  });

  // Élève User + Élève Profile
  const eleveUser = await prisma.user.upsert({
    where: { email: 'eleve.amara@sigr.gov' },
    update: {},
    create: {
      email: 'eleve.amara@sigr.gov',
      passwordHash,
      firstName: 'Karim',
      lastName: 'AMARA',
      matricule: 'SIGR-2026-0042',
      roleId: roleMap['STUDENT'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      isActive: true,
      phone: '+33 7 89 01 23 45',
    },
  });

  console.log('✓ Utilisateurs administratifs et comptes démo créés.');

  // 7. Students
  const studentsToCreate = [
    {
      matricule: 'SIGR-2026-0042',
      firstName: 'Karim',
      lastName: 'AMARA',
      dateOfBirth: new Date('2002-05-14'),
      placeOfBirth: 'Lyon',
      gender: 'M',
      phone: '+33 7 89 01 23 45',
      email: 'eleve.amara@sigr.gov',
      address: '14 Rue de la République, 69002 Lyon',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      userId: eleveUser.id,
    },
    {
      matricule: 'SIGR-2026-0043',
      firstName: 'Lucas',
      lastName: 'BERTRAND',
      dateOfBirth: new Date('2001-09-22'),
      placeOfBirth: 'Marseille',
      gender: 'M',
      phone: '+33 7 88 12 34 56',
      email: 'lucas.bertrand@sigr.gov',
      address: '8 Boulevard Michelet, 13008 Marseille',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
    },
    {
      matricule: 'SIGR-2026-0044',
      firstName: 'Inès',
      lastName: 'BENALI',
      dateOfBirth: new Date('2003-01-30'),
      placeOfBirth: 'Toulouse',
      gender: 'F',
      phone: '+33 7 87 23 45 67',
      email: 'ines.benali@sigr.gov',
      address: '22 Allée des Demoiselles, 31400 Toulouse',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
    },
    {
      matricule: 'SIGR-2026-0045',
      firstName: 'Maxime',
      lastName: 'GIRARD',
      dateOfBirth: new Date('2002-11-18'),
      placeOfBirth: 'Bordeaux',
      gender: 'M',
      phone: '+33 7 86 34 56 78',
      email: 'maxime.girard@sigr.gov',
      address: '5 Place Gambetta, 33000 Bordeaux',
      status: 'EN_PERMISSION',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
    },
    {
      matricule: 'SIGR-2026-0046',
      firstName: 'Sophie',
      lastName: 'LECLERC',
      dateOfBirth: new Date('2002-03-05'),
      placeOfBirth: 'Lille',
      gender: 'F',
      phone: '+33 7 85 45 67 89',
      email: 'sophie.leclerc@sigr.gov',
      address: '12 Rue Royale, 59000 Lille',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
    },
    {
      matricule: 'SIGR-2026-0051',
      firstName: 'Yanis',
      lastName: 'MEZIANE',
      dateOfBirth: new Date('2001-12-10'),
      placeOfBirth: 'Nice',
      gender: 'M',
      phone: '+33 7 84 56 78 90',
      email: 'yanis.meziane@sigr.gov',
      address: '40 Promenade des Anglais, 06000 Nice',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie2.id,
    },
    {
      matricule: 'CFGR-2026-0010',
      firstName: 'David',
      lastName: 'PETIT',
      dateOfBirth: new Date('1998-07-15'),
      placeOfBirth: 'Nantes',
      gender: 'M',
      phone: '+33 6 77 88 99 00',
      email: 'david.petit@cfgr.gov',
      address: '15 Rue Crébillon, 44000 Nantes',
      status: 'ACTIF',
      promotionYear: '2026',
      establishmentId: estabCFGR.id,
      groupementId: grp1CFGR.id,
      compagnieId: cieCFGR1.id,
    },
  ];

  const studentMap: Record<string, string> = {};
  for (const s of studentsToCreate) {
    const student = await prisma.student.upsert({
      where: { matricule: s.matricule },
      update: s,
      create: s,
    });
    studentMap[s.matricule] = student.id;
  }
  console.log('✓ Élèves enregistrés avec succès.');

  // 8. Sample Subjects and Assessments
  const subject1 = await prisma.subject.upsert({
    where: { establishmentId_code: { establishmentId: estabSIGR.id, code: 'ADM-101' } },
    update: {},
    create: {
      code: 'ADM-101',
      name: 'Règlementation Administrative et Procédures',
      coefficient: 2.0,
      establishmentId: estabSIGR.id,
    },
  });

  const subject2 = await prisma.subject.upsert({
    where: { establishmentId_code: { establishmentId: estabSIGR.id, code: 'TAC-201' } },
    update: {},
    create: {
      code: 'TAC-201',
      name: 'Instruction Tactique et Commandement',
      coefficient: 3.0,
      establishmentId: estabSIGR.id,
    },
  });

  const subject3 = await prisma.subject.upsert({
    where: { establishmentId_code: { establishmentId: estabSIGR.id, code: 'SPORT-01' } },
    update: {},
    create: {
      code: 'SPORT-01',
      name: 'Entraînement Physique Militaire',
      coefficient: 1.5,
      establishmentId: estabSIGR.id,
    },
  });

  const eval1 = await prisma.assessment.create({
    data: {
      title: 'Contrôle Continu n°1 — Procédures Administratives',
      type: 'CONTROLE',
      date: new Date('2026-03-10'),
      maxScore: 20.0,
      coefficient: 1.0,
      subjectId: subject1.id,
      compagnieId: cie1.id,
    },
  });

  const eval2 = await prisma.assessment.create({
    data: {
      title: 'Épreuve Pratique de Commandement et Tactique',
      type: 'EXAMEN',
      date: new Date('2026-03-25'),
      maxScore: 20.0,
      coefficient: 2.0,
      subjectId: subject2.id,
      compagnieId: cie1.id,
    },
  });

  // Grades for students
  const secUser = await prisma.user.findUnique({ where: { email: 'sec.cie1@sigr.gov' } });
  const dirSigrUser = await prisma.user.findUnique({ where: { email: 'directeur.sigr@ecoles.gov' } });

  if (secUser && dirSigrUser) {
    // Karim Amara
    await prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: eval1.id, studentId: studentMap['SIGR-2026-0042'] } },
      update: {},
      create: {
        assessmentId: eval1.id,
        studentId: studentMap['SIGR-2026-0042'],
        score: 16.5,
        comments: 'Très bon esprit d’analyse et rigueur documentaire.',
        status: 'VALIDEE',
        createdById: secUser.id,
        validatedById: dirSigrUser.id,
        validatedAt: new Date(),
      },
    });

    await prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: eval2.id, studentId: studentMap['SIGR-2026-0042'] } },
      update: {},
      create: {
        assessmentId: eval2.id,
        studentId: studentMap['SIGR-2026-0042'],
        score: 15.0,
        comments: 'Bonne prise de décision sur le terrain.',
        status: 'VALIDEE',
        createdById: secUser.id,
        validatedById: dirSigrUser.id,
        validatedAt: new Date(),
      },
    });

    // Lucas Bertrand
    await prisma.grade.upsert({
      where: { assessmentId_studentId: { assessmentId: eval1.id, studentId: studentMap['SIGR-2026-0043'] } },
      update: {},
      create: {
        assessmentId: eval1.id,
        studentId: studentMap['SIGR-2026-0043'],
        score: 13.0,
        comments: 'Travail satisfaisant, approfondir les détails réglementaires.',
        status: 'SOUMIS_VALIDATION',
        createdById: secUser.id,
      },
    });
  }
  console.log('✓ Notations et évaluations créées.');

  // 9. Sample Absences
  if (secUser) {
    await prisma.absence.create({
      data: {
        studentId: studentMap['SIGR-2026-0045'],
        establishmentId: estabSIGR.id,
        groupementId: grp1SIGR.id,
        compagnieId: cie1.id,
        startDate: new Date('2026-04-12T08:00:00Z'),
        endDate: new Date('2026-04-14T18:00:00Z'),
        durationHours: 20,
        type: 'PERMISSION',
        reason: 'Permission accordée pour raison familiale impérieuse.',
        isJustified: true,
        justification: 'Certificat familial n°442',
        recordedById: secUser.id,
      },
    });

    await prisma.absence.create({
      data: {
        studentId: studentMap['SIGR-2026-0043'],
        establishmentId: estabSIGR.id,
        groupementId: grp1SIGR.id,
        compagnieId: cie1.id,
        startDate: new Date('2026-04-05T08:00:00Z'),
        endDate: new Date('2026-04-05T12:00:00Z'),
        durationHours: 4,
        type: 'MEDICALE',
        reason: 'Consultation médicale au centre de santé de la base.',
        isJustified: true,
        justification: 'Attestation médicale militaire',
        recordedById: secUser.id,
      },
    });
  }
  console.log('✓ Absences enregistrées.');

  // 10. Sample Administrative Requests demonstrating the real workflow
  // Request 1: Permission submitted by Karim Amara, currently verified by Secrétariat Compagnie and pending Compagnie Head validation
  const req1 = await prisma.administrativeRequest.upsert({
    where: { trackingNumber: 'REQ-2026-0001' },
    update: {},
    create: {
      trackingNumber: 'REQ-2026-0001',
      studentId: studentMap['SIGR-2026-0042'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      requestTypeId: reqTypeMap['PERMISSION'],
      subject: 'Demande de permission de 72 heures pour événement familial',
      content: 'Je sollicite respectueusement l’autorisation de m’absenter du vendredi 24 octobre à 18h00 au dimanche 26 octobre à 20h00 afin d’assister aux obsèques de mon aïeul.',
      startDate: new Date('2026-10-24T18:00:00Z'),
      endDate: new Date('2026-10-26T20:00:00Z'),
      destination: 'Lyon (Rhône)',
      status: 'RECUE_SECRETARIAT_COMPAGNIE',
      currentStep: 'RESPONSABLE_COMPAGNIE',
      attachments: JSON.stringify([{ name: 'faire_part_obseques.pdf', size: '245 KB' }]),
    },
  });

  // History for Req 1
  await prisma.requestHistory.create({
    data: {
      requestId: req1.id,
      actorId: eleveUser.id,
      actorRole: 'STUDENT',
      action: 'CREATION',
      previousStatus: 'DRAFT',
      newStatus: 'SOUMISE',
      comments: 'Dépôt initial de la demande avec justificatif.',
    },
  });

  if (secUser) {
    await prisma.requestHistory.create({
      data: {
        requestId: req1.id,
        actorId: secUser.id,
        actorRole: 'COMPAGNIE_SECRETARY',
        action: 'TRANSMISSION',
        previousStatus: 'SOUMISE',
        newStatus: 'RECUE_SECRETARIAT_COMPAGNIE',
        comments: 'Pièces vérifiées et conformes. Dossier transmis pour examen au Commandant de Compagnie.',
      },
    });
  }

  // Request 2: Libération already reached Groupement Level
  const req2 = await prisma.administrativeRequest.upsert({
    where: { trackingNumber: 'REQ-2026-0002' },
    update: {},
    create: {
      trackingNumber: 'REQ-2026-0002',
      studentId: studentMap['SIGR-2026-0044'],
      establishmentId: estabSIGR.id,
      groupementId: grp1SIGR.id,
      compagnieId: cie1.id,
      requestTypeId: reqTypeMap['LIBERATION'],
      subject: 'Demande de libération pour réorientation professionnelle externe',
      content: 'Ayant réussi le concours d’entrée à l’école nationale d’ingénieurs, je sollicite ma libération à compter du 1er novembre 2026.',
      startDate: new Date('2026-11-01T08:00:00Z'),
      status: 'VALIDEE_COMPAGNIE',
      currentStep: 'RESPONSABLE_GROUPEMENT',
      attachments: JSON.stringify([{ name: 'attestation_reussite_concours.pdf', size: '412 KB' }]),
    },
  });

  // Notifications
  await prisma.notification.create({
    data: {
      userId: eleveUser.id,
      title: 'Dossier en cours d’instruction',
      message: 'Votre demande REQ-2026-0001 a été vérifiée par le secrétariat et transmise au Commandant de Compagnie.',
      type: 'INFO',
    },
  });

  console.log('✓ Demandes administratives et historique de workflow créés.');
  console.log('=== Base de données initialisée avec succès ! ===');
}

main()
  .catch((e) => {
    console.error('Erreur durant le seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
