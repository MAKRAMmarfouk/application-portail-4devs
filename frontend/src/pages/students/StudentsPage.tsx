import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Building,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService, establishmentService } from '../../services/api';
import { Student, Establishment } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PrintableDocument } from '../../components/printable/PrintableDocument';

export const StudentsPage: React.FC = () => {
  const { user, hasRole, isStudent } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEst, setSelectedEst] = useState('');

  // Selected student for dossier view
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [showPrintListModal, setShowPrintListModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Student Form
  const [newStudent, setNewStudent] = useState({
    matricule: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '2002-01-01',
    placeOfBirth: 'Paris',
    gender: 'M',
    phone: '',
    email: '',
    address: '',
    status: 'ACTIF',
    promotionYear: '2026',
    establishmentId: '',
    groupementId: '',
    compagnieId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
    establishmentService.getAll().then((res) => {
      setEstablishments(res.data);
      if (res.data.length > 0 && !newStudent.establishmentId) {
        const firstEst = res.data[0];
        const firstGrp = firstEst.groupements?.[0];
        const firstCie = firstGrp?.compagnies?.[0];
        setNewStudent((prev) => ({
          ...prev,
          establishmentId: firstEst.id,
          groupementId: firstGrp?.id || '',
          compagnieId: firstCie?.id || '',
        }));
      }
    });
  }, [search, statusFilter, selectedEst]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAll({
        search,
        status: statusFilter,
        establishmentId: selectedEst || undefined,
        limit: 100,
      });
      setStudents(res.data.data);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDossier = async (studentId: string) => {
    try {
      const res = await studentService.getById(studentId);
      setSelectedStudent(res.data);
      setShowDossierModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Matricule', 'Nom', 'Prénom', 'Établissement', 'Groupement', 'Compagnie', 'Statut', 'Promotion'];
    const rows = students.map((s) => [
      s.matricule,
      s.lastName,
      s.firstName,
      s.establishment?.code || '',
      s.groupement?.code || '',
      s.compagnie?.name || '',
      s.status,
      s.promotionYear || '2026',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `liste_eleves_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await studentService.create(newStudent);
      setShowCreateModal(false);
      loadStudents();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de l’enregistrement de l’élève.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            {isStudent ? 'Mon Dossier Élève' : 'Gestion des Effectifs Élèves'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} élève(s) répertorié(s) dans le périmètre autorisé
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isStudent && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Exporter CSV / Excel
              </button>

              <button
                onClick={() => setShowPrintListModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
              >
                <Printer className="w-4 h-4 text-institutional-primary" />
                Imprimer la Liste (A4)
              </button>

              {hasRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY') && (
                <button
                  onClick={() => {
                    setFormError(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouvel Élève
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      {!isStudent && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par matricule, nom, prénom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-institutional-primary"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-institutional-primary"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="EN_PERMISSION">En Permission</option>
              <option value="MALADE">Malade</option>
              <option value="DETACHE">Détaché</option>
              <option value="EXCLU">Exclu</option>
              <option value="DIPLOME">Diplômé</option>
            </select>

            {hasRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY') && (
              <select
                value={selectedEst}
                onChange={(e) => setSelectedEst(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-institutional-primary"
              >
                <option value="">Toutes les écoles</option>
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.code} — {est.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Matricule</th>
                <th className="py-3 px-4">Nom & Prénom</th>
                <th className="py-3 px-4">Établissement</th>
                <th className="py-3 px-4">Compagnie / Structure</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Promotion</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Aucun élève trouvé selon les filtres renseignés.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-institutional-dark">
                      {student.matricule}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {student.lastName} {student.firstName}
                      </div>
                      <div className="text-[11px] text-slate-400">{student.phone || student.email || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                        {student.establishment?.code}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{student.compagnie?.name}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {student.groupement?.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          student.status === 'ACTIF'
                            ? 'success'
                            : student.status === 'EN_PERMISSION'
                            ? 'warning'
                            : student.status === 'MALADE'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                        dot
                      >
                        {student.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {student.promotionYear || '2026'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDossier(student.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-institutional-primary font-semibold hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Consulter Fiche
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dossier Individuel Élève */}
      <Modal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        title={`Fiche Administrative Individuelle : ${selectedStudent?.matricule}`}
        subtitle={`${selectedStudent?.lastName} ${selectedStudent?.firstName} — Promotion ${selectedStudent?.promotionYear}`}
        maxWidth="4xl"
      >
        {selectedStudent && (
          <PrintableDocument
            title="FICHE INDIVIDUELLE DE L’ÉLÈVE"
            documentNumber={`FICHE-${selectedStudent.matricule}`}
            establishmentName={selectedStudent.establishment?.name}
            establishmentCode={selectedStudent.establishment?.code}
            visas={[
              { role: 'CHEF SECRÉTAIRE', label: 'Compagnie', status: 'CONFORME' },
              { role: 'COMMANDANT', label: 'Compagnie', status: 'VALIDÉ' },
              { role: 'DIRECTION', label: 'École', status: 'CERTIFIÉ' },
            ]}
          >
            {/* Identity Card */}
            <div className="grid grid-cols-3 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
              <div className="col-span-1 flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-slate-200">
                <div className="w-24 h-24 rounded-full bg-slate-200 border-2 border-institutional-primary flex items-center justify-center text-slate-400 font-bold text-xl">
                  {selectedStudent.photoUrl ? (
                    <img src={selectedStudent.photoUrl} alt="Photo" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{selectedStudent.firstName[0]}{selectedStudent.lastName[0]}</span>
                  )}
                </div>
                <p className="mt-3 font-mono font-bold text-xs text-institutional-dark">{selectedStudent.matricule}</p>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Promotion {selectedStudent.promotionYear}</span>
              </div>

              <div className="col-span-2 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Nom de famille</span>
                    <strong className="text-sm text-institutional-dark">{selectedStudent.lastName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Prénom(s)</span>
                    <strong className="text-sm text-institutional-dark">{selectedStudent.firstName}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date & Lieu de Naissance</span>
                    <span>
                      {selectedStudent.dateOfBirth
                        ? new Date(selectedStudent.dateOfBirth).toLocaleDateString('fr-FR')
                        : '—'}{' '}
                      ({selectedStudent.placeOfBirth || 'Non renseigné'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Sexe / Genre</span>
                    <span>{selectedStudent.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Rattachement Administratif</span>
                    <span>
                      {selectedStudent.establishment?.code} &rarr; {selectedStudent.groupement?.code} &rarr;{' '}
                      {selectedStudent.compagnie?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Statut Actuel</span>
                    <Badge variant="success" size="sm" dot>{selectedStudent.status}</Badge>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <p>Contact : {selectedStudent.phone || 'Non renseigné'} | {selectedStudent.email || 'Non renseigné'}</p>
                  <p>Adresse : {selectedStudent.address || 'Caserne / Base Militaire'}</p>
                </div>
              </div>
            </div>

            {/* Demandes Récentes */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                Historique des Demandes Administratives
              </h4>
              {selectedStudent.requests && selectedStudent.requests.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedStudent.requests.map((r) => (
                    <div key={r.id} className="flex justify-between p-2 bg-slate-50 rounded text-xs">
                      <span><strong>{r.trackingNumber}</strong> : {r.subject}</span>
                      <span className="font-semibold font-mono text-[11px]">{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune demande enregistrée à ce jour.</p>
              )}
            </div>

            {/* Absences Récentes */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2">
                Relevé Récent des Absences
              </h4>
              {selectedStudent.absences && selectedStudent.absences.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedStudent.absences.map((a) => (
                    <div key={a.id} className="flex justify-between p-2 bg-slate-50 rounded text-xs">
                      <span>Du {new Date(a.startDate).toLocaleDateString('fr-FR')} au {new Date(a.endDate).toLocaleDateString('fr-FR')} ({a.durationHours}h) - {a.type}</span>
                      <span className="italic">{a.reason || 'Sans motif particulier'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Aucune absence enregistrée.</p>
              )}
            </div>
          </PrintableDocument>
        )}
      </Modal>

      {/* Modal Impression de la Liste (A4) */}
      <Modal
        isOpen={showPrintListModal}
        onClose={() => setShowPrintListModal(false)}
        title="État Imprimable de la Liste des Élèves"
        subtitle="Rapport officiel au format A4"
        maxWidth="4xl"
      >
        <PrintableDocument
          title="LISTE OFFICIELLE DES ÉLÈVES EN FORMATION"
          documentNumber={`LISTE-ADM-${new Date().getFullYear()}-${students.length}`}
          visas={[
            { role: 'CHEF SECRÉTAIRE', label: 'Compagnie', status: 'CERTIFIÉ', signatureName: 'Sergent-Chef ROUX' },
            { role: 'DIRECTION', label: 'Validation', status: 'VALIDÉ', signatureName: 'Colonel VALENTIN' },
          ]}
        >
          <div className="mb-4 text-xs">
            <p><strong>Périmètre :</strong> {selectedEst || 'Tous établissements autorisés'}</p>
            <p><strong>Effectif Total Imprimé :</strong> {students.length} élève(s)</p>
          </div>

          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
              <tr>
                <th className="p-2 border-r border-slate-300">N°</th>
                <th className="p-2 border-r border-slate-300">Matricule</th>
                <th className="p-2 border-r border-slate-300">Nom & Prénom</th>
                <th className="p-2 border-r border-slate-300">Établissement</th>
                <th className="p-2 border-r border-slate-300">Compagnie</th>
                <th className="p-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((s, idx) => (
                <tr key={s.id}>
                  <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold">{s.matricule}</td>
                  <td className="p-2 border-r border-slate-200 font-semibold">{s.lastName} {s.firstName}</td>
                  <td className="p-2 border-r border-slate-200">{s.establishment?.code}</td>
                  <td className="p-2 border-r border-slate-200">{s.compagnie?.name}</td>
                  <td className="p-2 font-semibold">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintableDocument>
      </Modal>

      {/* Modal Nouvel Élève */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Enregistrement d'un Nouvel Élève"
        subtitle="Affectation hiérarchique et création de la fiche administrative"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Matricule Unique</label>
              <input
                type="text"
                required
                value={newStudent.matricule}
                onChange={(e) => setNewStudent({ ...newStudent, matricule: e.target.value.toUpperCase() })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono font-bold"
                placeholder="SIGR-2026-0099"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Promotion</label>
              <input
                type="text"
                required
                value={newStudent.promotionYear}
                onChange={(e) => setNewStudent({ ...newStudent, promotionYear: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Nom de famille</label>
              <input
                type="text"
                required
                value={newStudent.lastName}
                onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm uppercase"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Prénom(s)</label>
              <input
                type="text"
                required
                value={newStudent.firstName}
                onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Hierarchy Selection */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wide block">Rattachement Hiérarchique Strict</span>
            <div>
              <label className="font-semibold text-slate-600 block">Établissement</label>
              <select
                value={newStudent.establishmentId}
                onChange={(e) => {
                  const estId = e.target.value;
                  const est = establishments.find((x) => x.id === estId);
                  const firstGrp = est?.groupements?.[0];
                  const firstCie = firstGrp?.compagnies?.[0];
                  setNewStudent({
                    ...newStudent,
                    establishmentId: estId,
                    groupementId: firstGrp?.id || '',
                    compagnieId: firstCie?.id || '',
                  });
                }}
                className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs"
                required
              >
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.code} — {est.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-600 block">Groupement</label>
                <select
                  value={newStudent.groupementId}
                  onChange={(e) => {
                    const grpId = e.target.value;
                    const est = establishments.find((x) => x.id === newStudent.establishmentId);
                    const grp = est?.groupements?.find((g) => g.id === grpId);
                    setNewStudent({
                      ...newStudent,
                      groupementId: grpId,
                      compagnieId: grp?.compagnies?.[0]?.id || '',
                    });
                  }}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs"
                  required
                >
                  {establishments
                    .find((x) => x.id === newStudent.establishmentId)
                    ?.groupements?.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block">Compagnie</label>
                <select
                  value={newStudent.compagnieId}
                  onChange={(e) => setNewStudent({ ...newStudent, compagnieId: e.target.value })}
                  className="mt-1 block w-full p-2 border border-slate-200 rounded-lg text-xs"
                  required
                >
                  {establishments
                    .find((x) => x.id === newStudent.establishmentId)
                    ?.groupements?.find((g) => g.id === newStudent.groupementId)
                    ?.compagnies?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Enregistrer l’Élève
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
