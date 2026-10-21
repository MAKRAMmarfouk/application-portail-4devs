import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('========================================================');
  console.log('   DÉMARRAGE DES TESTS D’INTÉGRATION ET DE SÉCURITÉ     ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ✗ ${name} :`, err.response?.data?.error || err.message);
      failed++;
    }
  }

  // 1. Health check
  await test('Vérification de l’état du serveur (Health Check)', async () => {
    const res = await axios.get(`${API_BASE}/health`);
    if (res.data.status !== 'OK') throw new Error('Status non OK');
  });

  // 2. Auth: Super Admin Login
  let adminToken = '';
  await test('Authentification Super Administrateur', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'superadmin@ecoles.gov',
      password: 'admin123',
    });
    if (!res.data.token || res.data.user.role.code !== 'SUPER_ADMIN') {
      throw new Error('Échec de récupération du token ou rôle incorrect');
    }
    adminToken = res.data.token;
  });

  // 3. Auth: Élève Login
  let eleveToken = '';
  let eleveUser: any = null;
  await test('Authentification Compte Élève (Karim AMARA)', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'eleve.amara@sigr.gov',
      password: 'password123',
    });
    if (!res.data.token || res.data.user.role.code !== 'STUDENT') {
      throw new Error('Échec login élève');
    }
    eleveToken = res.data.token;
    eleveUser = res.data.user;
  });

  // 4. Hierarchy Check
  let estabs: any[] = [];
  await test('Consultation de la hiérarchie (SIGR, CFGR, EFQGR)', async () => {
    const res = await axios.get(`${API_BASE}/establishments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data) || res.data.length < 3) {
      throw new Error('Moins de 3 établissements trouvés');
    }
    estabs = res.data;
  });

  // 5. Isolation Check: Student cannot access establishments creation
  await test('Sécurité RBAC : L’élève ne peut pas créer un établissement (403)', async () => {
    try {
      await axios.post(
        `${API_BASE}/establishments`,
        { code: 'HACK', name: 'Tentative' },
        { headers: { Authorization: `Bearer ${eleveToken}` } }
      );
      throw new Error('La requête aurait dû être rejetée avec 403');
    } catch (err: any) {
      if (err.response?.status !== 403) throw err;
    }
  });

  // 6. Workflow Test: Student submits a new request
  let createdRequestId = '';
  await test('Workflow : L’élève soumet une demande administrative', async () => {
    const typesRes = await axios.get(`${API_BASE}/requests/types`, {
      headers: { Authorization: `Bearer ${eleveToken}` },
    });
    const permType = typesRes.data.find((t: any) => t.code === 'PERMISSION');

    const res = await axios.post(
      `${API_BASE}/requests`,
      {
        requestTypeId: permType.id,
        subject: 'Demande de permission de 48h - Test Automatisé',
        content: 'Motif de permission justifié pour fin de semaine d’instruction.',
        startDate: '2026-11-10T08:00:00Z',
        endDate: '2026-11-12T18:00:00Z',
        destination: 'Lyon',
      },
      { headers: { Authorization: `Bearer ${eleveToken}` } }
    );

    if (!res.data.id || res.data.status !== 'SOUMISE') {
      throw new Error('Statut initial invalide');
    }
    createdRequestId = res.data.id;
  });

  // 7. Workflow Test: Secrétaire Compagnie verifies and forwards
  let secToken = '';
  await test('Authentification Secrétaire Compagnie', async () => {
    const res = await axios.post(`${API_BASE}/auth/login`, {
      email: 'sec.cie1@sigr.gov',
      password: 'password123',
    });
    secToken = res.data.token;
  });

  await test('Workflow : Secrétaire Compagnie vérifie et transmet au Commandant', async () => {
    const res = await axios.post(
      `${API_BASE}/requests/${createdRequestId}/action`,
      {
        action: 'TRANSMIT_TO_RESPONSABLE_CIE',
        comments: 'Pièces vérifiées, avis favorable du secrétariat.',
      },
      { headers: { Authorization: `Bearer ${secToken}` } }
    );

    if (res.data.status !== 'RECUE_SECRETARIAT_COMPAGNIE' || res.data.currentStep !== 'RESPONSABLE_COMPAGNIE') {
      throw new Error('Étape ou statut incorrect après transmission secrétaire');
    }
  });

  // 8. Workflow Test: Responsable Compagnie validates
  let cdtToken = '';
  await test('Workflow : Responsable Compagnie examine et valide', async () => {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'resp.cie1@sigr.gov',
      password: 'password123',
    });
    cdtToken = loginRes.data.token;

    const res = await axios.post(
      `${API_BASE}/requests/${createdRequestId}/action`,
      {
        action: 'VALIDATE_CIE',
        comments: 'Accordé pour le niveau compagnie.',
      },
      { headers: { Authorization: `Bearer ${cdtToken}` } }
    );

    if (res.data.status !== 'VALIDEE_COMPAGNIE' || res.data.currentStep !== 'SECRETARIAT_GROUPEMENT') {
      throw new Error('Statut incorrect après validation compagnie');
    }
  });

  // 9. Absence recording test
  await test('Gestion des Absences : Enregistrement d’une absence', async () => {
    const studentsRes = await axios.get(`${API_BASE}/students`, {
      headers: { Authorization: `Bearer ${secToken}` },
    });
    const firstStudent = studentsRes.data.data[0];

    const res = await axios.post(
      `${API_BASE}/absences`,
      {
        studentId: firstStudent.id,
        startDate: '2026-11-20T08:00:00Z',
        endDate: '2026-11-20T12:00:00Z',
        durationHours: 4,
        type: 'JUSTIFIEE',
        reason: 'Rendez-vous dentaire militaire',
        isJustified: true,
        justification: 'Attestation dentaire',
      },
      { headers: { Authorization: `Bearer ${secToken}` } }
    );

    if (!res.data.id || res.data.durationHours !== 4) {
      throw new Error('Échec de création d’absence');
    }
  });

  // 10. Grades Assessment & Security Rule test
  await test('Sécurité des Notes : Le secrétaire ne peut pas modifier une note déjà validée par la Direction (403)', async () => {
    const assessmentsRes = await axios.get(`${API_BASE}/grades/assessments`, {
      headers: { Authorization: `Bearer ${secToken}` },
    });
    const ass = assessmentsRes.data[0];

    const studentsRes = await axios.get(`${API_BASE}/students`, {
      headers: { Authorization: `Bearer ${secToken}` },
    });
    const student = studentsRes.data.data[0];

    try {
      await axios.post(
        `${API_BASE}/grades/save`,
        {
          assessmentId: ass.id,
          studentId: student.id,
          score: 18.0,
          comments: 'Modification non autorisée par le secrétaire',
          modificationReason: 'Tentative sans visa',
        },
        { headers: { Authorization: `Bearer ${secToken}` } }
      );
      throw new Error('La modification aurait dû être rejetée avec 403');
    } catch (err: any) {
      if (err.response?.status !== 403) throw err;
    }
  });

  await test('Gestion des Notes : La Direction peut modifier et valider les notes avec traçabilité', async () => {
    const dirRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'directeur.sigr@ecoles.gov',
      password: 'password123',
    });
    const dirToken = dirRes.data.token;

    const assessmentsRes = await axios.get(`${API_BASE}/grades/assessments`, {
      headers: { Authorization: `Bearer ${dirToken}` },
    });
    const ass = assessmentsRes.data[0];

    const studentsRes = await axios.get(`${API_BASE}/students`, {
      headers: { Authorization: `Bearer ${dirToken}` },
    });
    const student = studentsRes.data.data[0];

    const res = await axios.post(
      `${API_BASE}/grades/save`,
      {
        assessmentId: ass.id,
        studentId: student.id,
        score: 17.0,
        comments: 'Note révisée avec mention d’excellence par la Direction',
        modificationReason: 'Rectification officielle après commission',
      },
      { headers: { Authorization: `Bearer ${dirToken}` } }
    );

    if (res.data.score !== 17.0) {
      throw new Error('Score enregistré incorrect');
    }
  });

  // 11. Security Audit Logs verification
  await test('Audit Sécurité : Vérification de la présence des journaux d’audit', async () => {
    const res = await axios.get(`${API_BASE}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error('Aucun journal d’audit trouvé');
    }
  });

  console.log('\n========================================================');
  console.log(` RÉSULTATS DES TESTS : ${passed} RÉUSSIS / ${failed} ÉCHECS`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
