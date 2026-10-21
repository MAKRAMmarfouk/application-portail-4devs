import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  History,
  Save,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { gradeService, studentService } from '../../services/api';
import { Assessment, Grade, Subject, Student } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PrintableDocument } from '../../components/printable/PrintableDocument';

export const GradesPage: React.FC = () => {
  const { user, hasRole, isStudent } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Score inputs state for quick editing
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: number; comments: string; reason: string }>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGradeHistory, setSelectedGradeHistory] = useState<Grade | null>(null);

  // New Assessment Form
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    type: 'CONTROLE',
    date: new Date().toISOString().slice(0, 10),
    maxScore: 20,
    coefficient: 1,
    subjectId: '',
    compagnieId: user?.compagnieId || user?.compagnie?.id || '',
  });

  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [assRes, subRes] = await Promise.all([
        gradeService.getAssessments(),
        gradeService.getSubjects(),
      ]);
      setAssessments(assRes.data);
      setSubjects(subRes.data);

      if (assRes.data.length > 0) {
        selectAssessment(assRes.data[0]);
      }
      if (subRes.data.length > 0 && !newAssessment.subjectId) {
        setNewAssessment((prev) => ({ ...prev, subjectId: subRes.data[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectAssessment = async (ass: Assessment) => {
    setSelectedAssessment(ass);
    try {
      const [gradesRes, studentsRes] = await Promise.all([
        gradeService.getGradesByAssessment(ass.id),
        studentService.getAll({ compagnieId: ass.compagnieId, limit: 100 }),
      ]);
      setGrades(gradesRes.data);
      setStudents(studentsRes.data.data);

      // Pre-fill score inputs
      const initialMap: Record<string, any> = {};
      gradesRes.data.forEach((g: Grade) => {
        initialMap[g.studentId] = {
          score: g.score,
          comments: g.comments || '',
          reason: '',
        };
      });
      setScoreInputs(initialMap);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGrade = async (studentId: string) => {
    if (!selectedAssessment) return;
    const data = scoreInputs[studentId];
    if (!data) return;

    try {
      await gradeService.saveGrade({
        assessmentId: selectedAssessment.id,
        studentId,
        score: parseFloat(data.score as any),
        comments: data.comments,
        modificationReason: data.reason || 'Saisie initiale',
      });
      setSaveSuccess(`Note enregistrée avec succès.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      selectAssessment(selectedAssessment);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la sauvegarde de la note.');
    }
  };

  const handleSubmitForValidation = async () => {
    if (!selectedAssessment) return;
    try {
      await gradeService.submitAssessment(selectedAssessment.id);
      alert('Toutes les notes de cette évaluation ont été transmises à la Direction pour validation.');
      selectAssessment(selectedAssessment);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur.');
    }
  };

  const handleValidateGrades = async () => {
    if (!selectedAssessment) return;
    try {
      await gradeService.validateAssessment(selectedAssessment.id);
      alert('Notes officiellement validées et certifiées par la Direction.');
      selectAssessment(selectedAssessment);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur.');
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await gradeService.createAssessment({
        ...newAssessment,
        compagnieId: user?.compagnieId || user?.compagnie?.id || assessments[0]?.compagnieId,
      });
      setShowCreateModal(false);
      loadInitialData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur de création de l’évaluation.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            Notations, Évaluations & Bulletins
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Saisie par le Secrétariat &rarr; Contrôle Hiérarchique &rarr; Validation Définitive Direction
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedAssessment && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
            >
              <Printer className="w-4 h-4 text-institutional-primary" />
              Imprimer le Relevé Officiel
            </button>
          )}

          {hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'COMPAGNIE_SECRETARY', 'COMPAGNIE_RESPONSIBLE') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Évaluation
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Assessment Selector Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3">
          Sélectionner l'Épreuve ou l'Évaluation :
        </span>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {assessments.map((ass) => {
            const isSelected = selectedAssessment?.id === ass.id;
            return (
              <button
                key={ass.id}
                onClick={() => selectAssessment(ass)}
                className={`p-3 rounded-xl border text-left text-xs whitespace-nowrap transition-all flex-shrink-0 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-institutional-dark">{ass.title}</span>
                  <Badge variant="purple" size="sm">{ass.type}</Badge>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                  <span>Matière : <strong>{ass.subject?.name}</strong></span>
                  <span>Coeff : <strong>{ass.coefficient}</strong></span>
                  <span>Barème : <strong>/{ass.maxScore}</strong></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Assessment Controls & Matrix */}
      {selectedAssessment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
          {/* Top Banner with Workflow Action */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-institutional-dark">
                Bordereau de Notation : {selectedAssessment.title}
              </h3>
              <p className="text-xs text-slate-500">
                Compagnie : {selectedAssessment.compagnie?.name} • Date de l'épreuve :{' '}
                {new Date(selectedAssessment.date).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {hasRole('SUPER_ADMIN', 'COMPAGNIE_SECRETARY') && (
                <button
                  onClick={handleSubmitForValidation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-institutional-primary border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100"
                >
                  <Send className="w-3.5 h-3.5" />
                  Transmettre à la Direction
                </button>
              )}

              {hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR', 'ERG_DIRECTOR') && (
                <button
                  onClick={handleValidateGrades}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valider Officiellement les Notes
                </button>
              )}
            </div>
          </div>

          {/* Grades Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Matricule</th>
                  <th className="py-3 px-4">Nom & Prénom de l’Élève</th>
                  <th className="py-3 px-4">Note / {selectedAssessment.maxScore}</th>
                  <th className="py-3 px-4">Appréciation pédagogique</th>
                  <th className="py-3 px-4">Statut de validation</th>
                  <th className="py-3 px-4 text-right">Historique & Sauvegarde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const existingGrade = grades.find((g) => g.studentId === student.id);
                  const currentInput = scoreInputs[student.id] || { score: 0, comments: '', reason: '' };
                  const isGradeValidated = existingGrade?.status === 'VALIDEE';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-institutional-dark">
                        {student.matricule}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {student.lastName} {student.firstName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={selectedAssessment.maxScore}
                            disabled={isGradeValidated && !hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR')}
                            value={currentInput.score}
                            onChange={(e) =>
                              setScoreInputs({
                                ...scoreInputs,
                                [student.id]: {
                                  ...currentInput,
                                  score: parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-20 p-1.5 border border-slate-300 rounded-lg text-sm font-mono font-bold text-center focus:ring-2 focus:ring-institutional-primary focus:outline-none"
                          />
                          <span className="text-slate-400 font-mono text-xs">/{selectedAssessment.maxScore}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Appréciation..."
                          value={currentInput.comments}
                          disabled={isGradeValidated && !hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR')}
                          onChange={(e) =>
                            setScoreInputs({
                              ...scoreInputs,
                              [student.id]: {
                                ...currentInput,
                                comments: e.target.value,
                              },
                            })
                          }
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            existingGrade?.status === 'VALIDEE'
                              ? 'success'
                              : existingGrade?.status === 'SOUMIS_VALIDATION'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                          dot
                        >
                          {existingGrade?.status || 'NON_SAISIE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {existingGrade?.history && existingGrade.history.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedGradeHistory(existingGrade);
                              setShowHistoryModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-institutional-primary"
                            title="Consulter l'historique des modifications"
                          >
                            <History className="w-4 h-4 inline" />
                          </button>
                        )}

                        {(!isGradeValidated || hasRole('SUPER_ADMIN', 'ESTABLISHMENT_DIRECTOR')) && (
                          <button
                            onClick={() => handleSaveGrade(student.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-institutional-dark font-semibold rounded-lg text-xs inline-flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Sauvegarder
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Historique des Modifications d'une Note */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Journal des Rectifications de Note"
        subtitle="Traçabilité obligatoire des modifications"
      >
        <div className="space-y-3 text-xs">
          {selectedGradeHistory?.history?.map((h, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">
                  Par {h.modifiedBy?.firstName} {h.modifiedBy?.lastName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(h.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="mt-1 text-slate-600 font-mono">
                Ancienne note : <strong>{h.previousScore}</strong> &rarr; Nouvelle note :{' '}
                <strong className="text-institutional-primary">{h.newScore}</strong>
              </p>
              <p className="mt-1 text-slate-700 italic">Motif de rectification : « {h.reason} »</p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal Impression Relevé de Notes A4 */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Relevé Officiel des Notes (Format A4)"
        subtitle="Document administratif officiel d'évaluation"
        maxWidth="4xl"
      >
        {selectedAssessment && (
          <PrintableDocument
            title={`RELEVÉ OFFICIEL DES NOTES : ${selectedAssessment.title}`}
            documentNumber={`RELEVE-${selectedAssessment.id.slice(0, 8).toUpperCase()}`}
            establishmentName={selectedAssessment.subject?.establishment?.name}
            establishmentCode={selectedAssessment.subject?.establishment?.code}
            visas={[
              { role: 'CHEF SECRÉTAIRE', label: 'Saisie des notes', status: 'CONFORME' },
              { role: 'DIRECTEUR', label: 'Validation officielle', status: 'HOMOLOGUÉ' },
            ]}
          >
            <div className="mb-4 text-xs">
              <p><strong>Matière / Module :</strong> {selectedAssessment.subject?.name} ({selectedAssessment.subject?.code})</p>
              <p><strong>Type d'épreuve :</strong> {selectedAssessment.type} • Coefficient : {selectedAssessment.coefficient}</p>
              <p><strong>Date de l'évaluation :</strong> {new Date(selectedAssessment.date).toLocaleDateString('fr-FR')}</p>
            </div>

            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase">
                <tr>
                  <th className="p-2 border-r border-slate-300">Matricule</th>
                  <th className="p-2 border-r border-slate-300">Élève</th>
                  <th className="p-2 border-r border-slate-300 text-center">Note / {selectedAssessment.maxScore}</th>
                  <th className="p-2 border-r border-slate-300 text-center">Statut</th>
                  <th className="p-2">Appréciation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {grades.map((g) => (
                  <tr key={g.id}>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold">{g.student?.matricule}</td>
                    <td className="p-2 border-r border-slate-200 font-semibold">{g.student?.lastName} {g.student?.firstName}</td>
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-center text-sm">{g.score}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-[10px]">{g.status}</td>
                    <td className="p-2 italic">{g.comments || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintableDocument>
        )}
      </Modal>

      {/* Modal Nouvelle Évaluation */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Création d'une Nouvelle Épreuve"
        subtitle="Associe une matière, un coefficient et une compagnie d'élèves"
      >
        <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 uppercase">Intitulé de l’épreuve</label>
            <input
              type="text"
              required
              value={newAssessment.title}
              onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
              placeholder="Ex: Examen Final de Règlementation Administrative"
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Matière</label>
              <select
                required
                value={newAssessment.subjectId}
                onChange={(e) => setNewAssessment({ ...newAssessment, subjectId: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Type d’évaluation</label>
              <select
                value={newAssessment.type}
                onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              >
                <option value="CONTROLE">Contrôle Continu</option>
                <option value="EXAMEN">Examen Final</option>
                <option value="TP">Travaux Pratiques / Tir</option>
                <option value="EPREUVE_SPORTIVE">Épreuve Sportive</option>
                <option value="DISCIPLINE">Note de Discipline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Coefficient</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={newAssessment.coefficient}
                onChange={(e) => setNewAssessment({ ...newAssessment, coefficient: parseFloat(e.target.value) || 1 })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Barème Max</label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={newAssessment.maxScore}
                onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: parseInt(e.target.value, 10) || 20 })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm font-mono"
              />
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
              Créer l'Évaluation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
