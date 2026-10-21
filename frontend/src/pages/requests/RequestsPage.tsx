import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestService } from '../../services/api';
import { AdministrativeRequest, RequestType } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PrintableDocument } from '../../components/printable/PrintableDocument';

export const RequestsPage: React.FC = () => {
  const { user, hasRole, isStudent } = useAuth();
  const [requests, setRequests] = useState<AdministrativeRequest[]>([]);
  const [types, setTypes] = useState<RequestType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Selected request for details or action
  const [selectedReq, setSelectedReq] = useState<AdministrativeRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Action form
  const [actionChoice, setActionChoice] = useState('');
  const [actionComments, setActionComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New Request Form
  const [newRequest, setNewRequest] = useState({
    requestTypeId: '',
    subject: '',
    content: '',
    startDate: '',
    endDate: '',
    destination: '',
  });

  useEffect(() => {
    loadRequests();
    requestService.getTypes().then((res) => {
      setTypes(res.data);
      if (res.data.length > 0 && !newRequest.requestTypeId) {
        setNewRequest((prev) => ({ ...prev, requestTypeId: res.data[0].id }));
      }
    });
  }, [search, statusFilter, typeFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await requestService.getAll({
        search,
        status: statusFilter,
        type: typeFilter,
      });
      setRequests(res.data.data);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const res = await requestService.getById(id);
      setSelectedReq(res.data);
      setShowDetailModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenAction = (req: AdministrativeRequest, defaultAction: string) => {
    setSelectedReq(req);
    setActionChoice(defaultAction);
    setActionComments('');
    setRejectionReason('');
    setActionError(null);
    setShowActionModal(true);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setActionError(null);
    setActionLoading(true);

    try {
      await requestService.executeAction(selectedReq.id, {
        action: actionChoice,
        comments: actionComments,
        reason: rejectionReason,
      });
      setShowActionModal(false);
      setShowDetailModal(false);
      loadRequests();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Erreur lors de l’exécution du workflow.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionLoading(true);
    try {
      await requestService.create(newRequest);
      setShowCreateModal(false);
      setNewRequest({
        requestTypeId: types[0]?.id || '',
        subject: '',
        content: '',
        startDate: '',
        endDate: '',
        destination: '',
      });
      loadRequests();
    } catch (err: any) {
      setActionError(err.response?.data?.error || 'Erreur lors de la création de la demande.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to determine if user can act on this request
  const canUserActOnRequest = (req: AdministrativeRequest) => {
    if (!user) return false;
    if (user.role.code === 'SUPER_ADMIN') return true;

    const userCieId = user.compagnieId || user.compagnie?.id;
    const userGrpId = user.groupementId || user.groupement?.id;
    const userEstId = user.establishmentId || user.establishment?.id;
    const userStdId = user.studentId || user.studentProfile?.id;

    if (req.currentStep === 'SECRETARIAT_COMPAGNIE' && user.role.code === 'COMPAGNIE_SECRETARY') {
      return userCieId === req.compagnieId;
    }
    if (req.currentStep === 'RESPONSABLE_COMPAGNIE' && user.role.code === 'COMPAGNIE_RESPONSIBLE') {
      return userCieId === req.compagnieId;
    }
    if (req.currentStep === 'SECRETARIAT_GROUPEMENT' && user.role.code === 'GROUPEMENT_SECRETARY') {
      return userGrpId === req.groupementId;
    }
    if (req.currentStep === 'RESPONSABLE_GROUPEMENT' && user.role.code === 'GROUPEMENT_RESPONSIBLE') {
      return userGrpId === req.groupementId;
    }
    if (req.currentStep === 'DIRECTION_ECOLE' && user.role.code === 'ESTABLISHMENT_DIRECTOR') {
      return userEstId === req.establishmentId;
    }
    if (req.currentStep === 'SECRETARIAT_ERG' && user.role.code === 'ERG_SECRETARY') {
      return true;
    }
    if (req.currentStep === 'DIRECTEUR_ERG' && user.role.code === 'ERG_DIRECTOR') {
      return true;
    }
    if (req.currentStep === 'ELEVE' && user.role.code === 'STUDENT' && userStdId === req.studentId) {
      return true;
    }

    return false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDEE_DEFINITIVEMENT':
        return <Badge variant="success" dot>Validée Définitivement</Badge>;
      case 'REFUSEE':
        return <Badge variant="danger" dot>Refusée</Badge>;
      case 'RETOUR_CORRECTION':
        return <Badge variant="warning" dot>Retour pour correction</Badge>;
      case 'VALIDEE_COMPAGNIE':
        return <Badge variant="purple" dot>Validée par la Compagnie</Badge>;
      case 'VALIDEE_GROUPEMENT':
        return <Badge variant="purple" dot>Validée par le Groupement</Badge>;
      case 'TRANSMIS_ERG':
        return <Badge variant="primary" dot>Transmis à l'ERG</Badge>;
      default:
        return <Badge variant="warning" dot>{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            Circuit Hiérarchique des Demandes Administratives
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation échelonnée : Élève &rarr; Secrétariat Cie &rarr; Cdt Cie &rarr; Groupement &rarr; Direction &rarr; ERG
          </p>
        </div>

        <button
          onClick={() => {
            setActionError(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Déposer une Demande
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="N° dossier (REQ-...), nom élève, objet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-institutional-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-institutional-primary"
          >
            <option value="ALL">Tous les types de demandes</option>
            {types.map((t) => (
              <option key={t.id} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-institutional-primary"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="SOUMISE">Soumise (En attente Secrétariat Cie)</option>
            <option value="RECUE_SECRETARIAT_COMPAGNIE">Vérifiée Secrétariat (En attente Cdt Cie)</option>
            <option value="VALIDEE_COMPAGNIE">Validée Cie (En attente Groupement)</option>
            <option value="RECUE_SECRETARIAT_GROUPEMENT">En attente Cdt Groupement</option>
            <option value="VALIDEE_GROUPEMENT">Validée Groupement (En attente Direction)</option>
            <option value="TRANSMIS_ERG">Transmis à la Direction Générale ERG</option>
            <option value="VALIDEE_DEFINITIVEMENT">Validée Définitivement</option>
            <option value="REFUSEE">Refusée</option>
            <option value="RETOUR_CORRECTION">Retour pour correction</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Dossier</th>
                <th className="py-3 px-4">Élève Demandeur</th>
                <th className="py-3 px-4">Type de Demande</th>
                <th className="py-3 px-4">Objet & Période</th>
                <th className="py-3 px-4">Statut Actuel</th>
                <th className="py-3 px-4">Échelon / Étape</th>
                <th className="py-3 px-4 text-right">Décision & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Aucun dossier administratif trouvé.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const canAct = canUserActOnRequest(req);
                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        canAct ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-institutional-dark">
                        {req.trackingNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {req.student?.lastName} {req.student?.firstName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {req.student?.matricule} • {req.compagnie?.name}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">{req.requestType.name}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate">{req.subject}</div>
                        {req.startDate && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Du {new Date(req.startDate).toLocaleDateString('fr-FR')} au{' '}
                            {req.endDate ? new Date(req.endDate).toLocaleDateString('fr-FR') : '—'}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {req.currentStep}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenDetail(req.id)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-block"
                          title="Consulter le dossier et l'historique"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canAct && (
                          <button
                            onClick={() => {
                              // Decide default action depending on step
                              let defAction = 'VALIDATE_CIE';
                              if (req.currentStep === 'SECRETARIAT_COMPAGNIE') defAction = 'TRANSMIT_TO_RESPONSABLE_CIE';
                              if (req.currentStep === 'RESPONSABLE_COMPAGNIE') defAction = 'VALIDATE_CIE';
                              if (req.currentStep === 'SECRETARIAT_GROUPEMENT') defAction = 'TRANSMIT_TO_RESPONSABLE_GROUP';
                              if (req.currentStep === 'RESPONSABLE_GROUPEMENT') defAction = 'VALIDATE_GROUP';
                              if (req.currentStep === 'DIRECTION_ECOLE') defAction = 'VALIDATE_DIRECTION';
                              if (req.currentStep === 'SECRETARIAT_ERG') defAction = 'TRANSMIT_TO_DIRECTEUR_ERG';
                              if (req.currentStep === 'DIRECTEUR_ERG') defAction = 'VALIDATE_ERG';
                              if (req.currentStep === 'ELEVE') defAction = 'RESUBMIT';

                              handleOpenAction(req, defAction);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-institutional-primary text-white font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <span>Instruire</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Détail Dossier & Timeline */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Dossier : ${selectedReq?.trackingNumber}`}
        subtitle={`${selectedReq?.requestType.name} — Élève : ${selectedReq?.student?.lastName} ${selectedReq?.student?.firstName}`}
        maxWidth="4xl"
      >
        {selectedReq && (
          <div className="space-y-6 text-xs">
            {/* Top Bar with Print */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">Statut :</span>
                {getStatusBadge(selectedReq.status)}
                <span className="text-slate-400">|</span>
                <span className="font-semibold text-slate-600">Étape active : {selectedReq.currentStep}</span>
              </div>
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-institutional-dark text-white font-semibold hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer Fiche Officielle
              </button>
            </div>

            {/* Request Content */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="font-bold text-sm text-institutional-dark">{selectedReq.subject}</h4>
              <p className="text-slate-700 text-xs whitespace-pre-wrap leading-relaxed">{selectedReq.content}</p>
              {selectedReq.destination && (
                <p className="text-slate-500 pt-2 border-t border-slate-100">
                  <strong>Destination déclarée :</strong> {selectedReq.destination}
                </p>
              )}
              {selectedReq.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <strong>Motif de refus hiérarchique :</strong> {selectedReq.rejectionReason}
                </div>
              )}
              {selectedReq.correctionNotes && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                  <strong>Notes de correction :</strong> {selectedReq.correctionNotes}
                </div>
              )}
            </div>

            {/* Workflow Audit Timeline */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-institutional-primary" />
                Historique et Traçabilité du Circuit
              </h4>
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-4 py-2">
                {selectedReq.history?.map((h, i) => (
                  <div key={i} className="ml-6 relative">
                    <span
                      className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                        h.action === 'VALIDATION'
                          ? 'bg-emerald-500'
                          : h.action === 'REFUS'
                          ? 'bg-rose-500'
                          : h.action === 'RETOUR'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-institutional-dark">
                          {h.action} — {h.actor?.firstName} {h.actor?.lastName} ({h.actorRole})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(h.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">
                        Passage de <code>{h.previousStatus || 'BROUILLON'}</code> &rarr;{' '}
                        <code>{h.newStatus}</code>
                      </p>
                      {h.comments && (
                        <p className="mt-1.5 p-2 bg-white rounded border border-slate-200 italic text-slate-700">
                          « {h.comments} »
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* If user can act on it from within detail modal */}
            {canUserActOnRequest(selectedReq) && (
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    handleOpenAction(selectedReq, 'REJECT');
                  }}
                  className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold hover:bg-rose-100"
                >
                  Refuser avec motif
                </button>
                <button
                  onClick={() => {
                    handleOpenAction(selectedReq, 'RETURN_FOR_CORRECTION');
                  }}
                  className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold hover:bg-amber-100"
                >
                  Retour pour correction
                </button>
                <button
                  onClick={() => {
                    let nextAction = 'VALIDATE_CIE';
                    if (selectedReq.currentStep === 'SECRETARIAT_COMPAGNIE') nextAction = 'TRANSMIT_TO_RESPONSABLE_CIE';
                    if (selectedReq.currentStep === 'SECRETARIAT_GROUPEMENT') nextAction = 'TRANSMIT_TO_RESPONSABLE_GROUP';
                    if (selectedReq.currentStep === 'RESPONSABLE_GROUPEMENT') nextAction = 'VALIDATE_GROUP';
                    if (selectedReq.currentStep === 'DIRECTION_ECOLE') nextAction = 'VALIDATE_DIRECTION';
                    if (selectedReq.currentStep === 'SECRETARIAT_ERG') nextAction = 'TRANSMIT_TO_DIRECTEUR_ERG';
                    if (selectedReq.currentStep === 'DIRECTEUR_ERG') nextAction = 'VALIDATE_ERG';
                    if (selectedReq.currentStep === 'ELEVE') nextAction = 'RESUBMIT';

                    handleOpenAction(selectedReq, nextAction);
                  }}
                  className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700"
                >
                  Valider / Transmettre à l'étape suivante &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Instruction Hiérarchique (Action sur la demande) */}
      <Modal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        title={`Décision Hiérarchique : ${selectedReq?.trackingNumber}`}
        subtitle={`Votre rôle : ${user?.role.name}`}
      >
        <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 uppercase">Action à effectuer</label>
            <select
              value={actionChoice}
              onChange={(e) => setActionChoice(e.target.value)}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-institutional-dark"
            >
              {selectedReq?.currentStep === 'SECRETARIAT_COMPAGNIE' && (
                <option value="TRANSMIT_TO_RESPONSABLE_CIE">
                  Vérifier les pièces & Transmettre au Commandant de Compagnie
                </option>
              )}
              {selectedReq?.currentStep === 'RESPONSABLE_COMPAGNIE' && (
                <>
                  <option value="VALIDATE_CIE">
                    Valider au niveau Compagnie (Transmission au Groupement)
                  </option>
                  <option value="REJECT">Refuser la demande (Motif obligatoire)</option>
                  <option value="RETURN_FOR_CORRECTION">
                    Retourner pour correction à l’élève
                  </option>
                </>
              )}
              {selectedReq?.currentStep === 'SECRETARIAT_GROUPEMENT' && (
                <option value="TRANSMIT_TO_RESPONSABLE_GROUP">
                  Vérifier & Transmettre au Chef de Groupement
                </option>
              )}
              {selectedReq?.currentStep === 'RESPONSABLE_GROUPEMENT' && (
                <>
                  <option value="VALIDATE_GROUP">
                    Valider au niveau Groupement (Transmission à la Direction)
                  </option>
                  <option value="REJECT">Refuser la demande (Motif obligatoire)</option>
                  <option value="RETURN_FOR_CORRECTION">Retourner pour correction</option>
                </>
              )}
              {selectedReq?.currentStep === 'DIRECTION_ECOLE' && (
                <>
                  <option value="VALIDATE_DIRECTION">
                    {selectedReq.requestType.requiresGeneralAdmin
                      ? 'Valider et Transmettre à l’Administration Générale (ERG)'
                      : 'Validation Définitive de l’École (Clôture accordée)'}
                  </option>
                  <option value="REJECT">Refuser la demande (Motif obligatoire)</option>
                  <option value="RETURN_FOR_CORRECTION">Retourner pour correction</option>
                </>
              )}
              {selectedReq?.currentStep === 'SECRETARIAT_ERG' && (
                <option value="TRANSMIT_TO_DIRECTEUR_ERG">
                  Transmettre au Directeur Général ERG
                </option>
              )}
              {selectedReq?.currentStep === 'DIRECTEUR_ERG' && (
                <>
                  <option value="VALIDATE_ERG">Validation Finale ERG (Clôture accordée)</option>
                  <option value="REJECT">Refuser définitivement</option>
                </>
              )}
              {selectedReq?.currentStep === 'ELEVE' && (
                <option value="RESUBMIT">Resoumettre après correction des pièces</option>
              )}
            </select>
          </div>

          {actionChoice === 'REJECT' && (
            <div>
              <label className="font-bold text-rose-700 uppercase">
                Motif obligatoire du refus hiérarchique *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explication claire du motif de rejet administratif ou disciplinaire..."
                className="mt-1 block w-full p-2.5 border border-rose-300 rounded-lg text-sm bg-rose-50/30"
              />
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 uppercase">
              Commentaires ou observations (Enregistrés au journal d'audit)
            </label>
            <textarea
              rows={2}
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              placeholder="Observation facultative..."
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowActionModal(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Enregistrement...' : 'Confirmer la décision'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Déposer une Demande */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Dépôt d'une Demande Administrative"
        subtitle="Ouverture d'un dossier dans le circuit réglementaire"
      >
        <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 uppercase">Nature de la demande</label>
            <select
              value={newRequest.requestTypeId}
              onChange={(e) => setNewRequest({ ...newRequest, requestTypeId: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              required
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.requiresGeneralAdmin ? '(Requiert visa ERG)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Objet de la demande</label>
            <input
              type="text"
              required
              value={newRequest.subject}
              onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
              placeholder="Ex: Demande de permission exceptionnelle de sortie"
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Date de début (si applicable)</label>
              <input
                type="date"
                value={newRequest.startDate}
                onChange={(e) => setNewRequest({ ...newRequest, startDate: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Date de fin</label>
              <input
                type="date"
                value={newRequest.endDate}
                onChange={(e) => setNewRequest({ ...newRequest, endDate: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Lieu ou destination prévue</label>
            <input
              type="text"
              value={newRequest.destination}
              onChange={(e) => setNewRequest({ ...newRequest, destination: e.target.value })}
              placeholder="Ex: Domicile familial à Marseille"
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Exposé des motifs & justification détaillée</label>
            <textarea
              required
              rows={4}
              value={newRequest.content}
              onChange={(e) => setNewRequest({ ...newRequest, content: e.target.value })}
              placeholder="Décrivez avec précision la situation, les motifs et les dates exactes..."
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
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
              disabled={actionLoading}
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? 'Soumission...' : 'Soumettre la Demande'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Impression Officielle A4 Fiche de Demande */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Fiche Officielle Imprimable de Demande Administrative"
        subtitle="Rapport avec visas hiérarchiques certifiés"
        maxWidth="4xl"
      >
        {selectedReq && (
          <PrintableDocument
            title={`DEMANDE ADMINISTRATIVE : ${selectedReq.requestType.name}`}
            documentNumber={selectedReq.trackingNumber}
            establishmentName={selectedReq.establishment?.name}
            establishmentCode={selectedReq.establishment?.code}
            visas={[
              {
                role: 'SECRÉTARIAT',
                label: 'Compagnie',
                status: 'CONFORME',
                date: new Date(selectedReq.createdAt).toLocaleDateString('fr-FR'),
              },
              {
                role: 'COMMANDANT',
                label: 'Compagnie',
                status: selectedReq.status.includes('COMPAGNIE') || selectedReq.status.includes('GROUPEMENT') || selectedReq.status.includes('DIRECTION') ? 'AVIS FAVORABLE' : 'EN COURS',
              },
              {
                role: 'CHEF DE CORPS',
                label: 'Groupement',
                status: selectedReq.status.includes('GROUPEMENT') || selectedReq.status.includes('DIRECTION') ? 'AVIS FAVORABLE' : 'EN ATTENTE',
              },
              {
                role: 'DIRECTION',
                label: 'Établissement',
                status: selectedReq.status === 'VALIDEE_DEFINITIVEMENT' ? 'ACCORDÉ' : selectedReq.status === 'REFUSEE' ? 'REFUSÉ' : 'EN ATTENTE',
              },
            ]}
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Identité de l’Élève</p>
                  <p className="font-bold text-sm text-institutional-dark">
                    {selectedReq.student?.lastName} {selectedReq.student?.firstName}
                  </p>
                  <p className="font-mono text-slate-600">Matricule : {selectedReq.student?.matricule}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Affectation</p>
                  <p className="font-semibold text-slate-800">
                    {selectedReq.establishment?.name} ({selectedReq.establishment?.code})
                  </p>
                  <p className="text-slate-600">{selectedReq.compagnie?.name} • {selectedReq.groupement?.name}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Objet de la requête</p>
                <p className="font-bold text-sm text-slate-900">{selectedReq.subject}</p>
                {selectedReq.startDate && (
                  <p className="text-slate-600 mt-1">
                    <strong>Période sollicitée :</strong> Du {new Date(selectedReq.startDate).toLocaleDateString('fr-FR')} au {selectedReq.endDate ? new Date(selectedReq.endDate).toLocaleDateString('fr-FR') : '—'}
                  </p>
                )}
                {selectedReq.destination && (
                  <p className="text-slate-600">
                    <strong>Destination :</strong> {selectedReq.destination}
                  </p>
                )}
              </div>

              <div>
                <p className="text-slate-500 font-bold uppercase text-[10px]">Motifs et Justifications</p>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedReq.content}
                </div>
              </div>

              {selectedReq.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800">
                  <p className="font-bold uppercase text-[10px]">Décision de Refus :</p>
                  <p>{selectedReq.rejectionReason}</p>
                </div>
              )}
            </div>
          </PrintableDocument>
        )}
      </Modal>
    </div>
  );
};
