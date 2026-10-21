import React, { useState, useEffect } from 'react';
import {
  CalendarX,
  Search,
  Plus,
  Printer,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { absenceService, studentService } from '../../services/api';
import { Absence, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PrintableDocument } from '../../components/printable/PrintableDocument';

export const AbsencesPage: React.FC = () => {
  const { user, hasRole, isStudent } = useAuth();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // New Absence Form
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [newAbsence, setNewAbsence] = useState({
    studentId: '',
    startDate: '',
    endDate: '',
    durationHours: 4,
    type: 'INJUSTIFIEE',
    reason: '',
    isJustified: false,
    justification: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadAbsences();
    if (!isStudent) {
      studentService.getAll({ limit: 100 }).then((res) => {
        setStudentsList(res.data.data);
        if (res.data.data.length > 0 && !newAbsence.studentId) {
          setNewAbsence((prev) => ({ ...prev, studentId: res.data.data[0].id }));
        }
      });
    }
  }, [typeFilter, startDateFilter, endDateFilter]);

  const loadAbsences = async () => {
    try {
      setLoading(true);
      const res = await absenceService.getAll({
        type: typeFilter,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });
      setAbsences(res.data.data);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await absenceService.create(newAbsence);
      setShowCreateModal(false);
      setNewAbsence({
        studentId: studentsList[0]?.id || '',
        startDate: '',
        endDate: '',
        durationHours: 4,
        type: 'INJUSTIFIEE',
        reason: '',
        isJustified: false,
        justification: '',
      });
      loadAbsences();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de l’enregistrement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            {isStudent ? 'Mon Historique des Absences' : 'Suivi & Registre des Absences'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} absence(s) constatée(s) et répertoriée(s)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isStudent && (
            <>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
              >
                <Printer className="w-4 h-4 text-institutional-primary" />
                Imprimer l'État Récapitulatif
              </button>

              {hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY', 'COMPAGNIE_RESPONSIBLE') && (
                <button
                  onClick={() => {
                    setFormError(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Saisir une Absence
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-institutional-primary"
          >
            <option value="ALL">Tous les types d'absences</option>
            <option value="INJUSTIFIEE">Injustifiée</option>
            <option value="JUSTIFIEE">Justifiée</option>
            <option value="MEDICALE">Médicale (Infirmerie / Hôpital)</option>
            <option value="PERMISSION">Permission Réglementaire</option>
            <option value="MISSION">Mission Commandée</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>Période du :</span>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
          <span>au :</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Élève</th>
                <th className="py-3 px-4">Compagnie</th>
                <th className="py-3 px-4">Période d'Absence</th>
                <th className="py-3 px-4">Durée (h)</th>
                <th className="py-3 px-4">Type & Justification</th>
                <th className="py-3 px-4">Motif Constaté</th>
                <th className="py-3 px-4">Enregistré par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {absences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Aucune absence enregistrée pour les filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                absences.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {a.student?.lastName} {a.student?.firstName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{a.student?.matricule}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {a.student?.compagnie?.code || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        Du {new Date(a.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Au {new Date(a.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {a.durationHours} h
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          a.type === 'INJUSTIFIEE'
                            ? 'danger'
                            : a.type === 'MEDICALE'
                            ? 'warning'
                            : a.type === 'PERMISSION'
                            ? 'primary'
                            : 'success'
                        }
                        size="sm"
                      >
                        {a.type}
                      </Badge>
                      {a.isJustified && (
                        <span className="block text-[10px] text-emerald-600 mt-0.5">
                          ✓ {a.justification || 'Justificatif fourni'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 truncate">
                      {a.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {a.recordedBy?.firstName} {a.recordedBy?.lastName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Saisie d'une Absence */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Enregistrement d'une Absence"
        subtitle="Constat administratif au registre d'appel"
      >
        <form onSubmit={handleCreateAbsence} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 uppercase">Élève concerné</label>
            <select
              required
              value={newAbsence.studentId}
              onChange={(e) => setNewAbsence({ ...newAbsence, studentId: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            >
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.matricule} — {s.lastName} {s.firstName} ({s.compagnie?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Date & Heure de début</label>
              <input
                type="datetime-local"
                required
                value={newAbsence.startDate}
                onChange={(e) => setNewAbsence({ ...newAbsence, startDate: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Date & Heure de fin</label>
              <input
                type="datetime-local"
                required
                value={newAbsence.endDate}
                onChange={(e) => setNewAbsence({ ...newAbsence, endDate: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Volume horaire (heures)</label>
              <input
                type="number"
                min="1"
                required
                value={newAbsence.durationHours}
                onChange={(e) => setNewAbsence({ ...newAbsence, durationHours: parseInt(e.target.value, 10) || 1 })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Type d'absence</label>
              <select
                value={newAbsence.type}
                onChange={(e) => setNewAbsence({ ...newAbsence, type: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value="INJUSTIFIEE">Injustifiée</option>
                <option value="JUSTIFIEE">Justifiée</option>
                <option value="MEDICALE">Médicale</option>
                <option value="PERMISSION">Permission</option>
                <option value="MISSION">Mission</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Motif / Circonstances</label>
            <input
              type="text"
              value={newAbsence.reason}
              onChange={(e) => setNewAbsence({ ...newAbsence, reason: e.target.value })}
              placeholder="Ex: Retard à l'appel de 08h00, consultation infirmerie..."
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isJustified"
                checked={newAbsence.isJustified}
                onChange={(e) => setNewAbsence({ ...newAbsence, isJustified: e.target.checked })}
                className="rounded text-institutional-primary"
              />
              <label htmlFor="isJustified" className="font-semibold text-slate-700">
                Absence justifiée avec pièce réglementaire
              </label>
            </div>
            {newAbsence.isJustified && (
              <input
                type="text"
                placeholder="Référence de la pièce (ex: Certificat médical n°...)"
                value={newAbsence.justification}
                onChange={(e) => setNewAbsence({ ...newAbsence, justification: e.target.value })}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            )}
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
              Enregistrer l'Absence
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Impression État Récapitulatif Absences */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="État Récapitulatif des Absences"
        subtitle="Rapport officiel au format A4"
        maxWidth="4xl"
      >
        <PrintableDocument
          title="ÉTAT RÉCAPITULATIF DES ABSENCES ET DISPENSES"
          documentNumber={`ETAT-ABS-${new Date().getFullYear()}-${absences.length}`}
          visas={[
            { role: 'CHEF SECRÉTAIRE', label: 'Compagnie', status: 'CONFORME' },
            { role: 'COMMANDANT', label: 'Compagnie', status: 'VU ET APPROUVÉ' },
          ]}
        >
          <div className="mb-4 text-xs">
            <p><strong>Période considérée :</strong> Année d'instruction en cours</p>
            <p><strong>Total des absences répertoriées :</strong> {absences.length} saisie(s)</p>
          </div>

          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
              <tr>
                <th className="p-2 border-r border-slate-300">Matricule</th>
                <th className="p-2 border-r border-slate-300">Élève</th>
                <th className="p-2 border-r border-slate-300">Période</th>
                <th className="p-2 border-r border-slate-300 text-center">Durée</th>
                <th className="p-2 border-r border-slate-300">Type</th>
                <th className="p-2">Motif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {absences.map((a) => (
                <tr key={a.id}>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold">{a.student?.matricule}</td>
                  <td className="p-2 border-r border-slate-200 font-semibold">{a.student?.lastName} {a.student?.firstName}</td>
                  <td className="p-2 border-r border-slate-200">
                    {new Date(a.startDate).toLocaleDateString('fr-FR')} &rarr; {new Date(a.endDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-2 border-r border-slate-200 font-mono text-center">{a.durationHours}h</td>
                  <td className="p-2 border-r border-slate-200 font-semibold">{a.type}</td>
                  <td className="p-2 italic">{a.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintableDocument>
      </Modal>
    </div>
  );
};
