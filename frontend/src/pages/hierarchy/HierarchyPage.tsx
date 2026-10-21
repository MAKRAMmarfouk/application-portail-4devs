import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { establishmentService, groupementService, compagnieService } from '../../services/api';
import { Establishment, Groupement, Compagnie } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const HierarchyPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEst, setExpandedEst] = useState<Record<string, boolean>>({});
  const [expandedGrp, setExpandedGrp] = useState<Record<string, boolean>>({});

  // Modals
  const [showEstModal, setShowEstModal] = useState(false);
  const [showGrpModal, setShowGrpModal] = useState(false);
  const [showCieModal, setShowCieModal] = useState(false);

  // Form states
  const [estForm, setEstForm] = useState({ code: '', name: '', address: '', phone: '', email: '', description: '' });
  const [grpForm, setGrpForm] = useState({ code: '', name: '', establishmentId: '', description: '' });
  const [cieForm, setCieForm] = useState({ code: '', name: '', groupementId: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await establishmentService.getAll();
      setEstablishments(res.data);
      // Auto-expand first establishment
      if (res.data.length > 0) {
        setExpandedEst({ [res.data[0].id]: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEst = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await establishmentService.create(estForm);
      setShowEstModal(false);
      setEstForm({ code: '', name: '', address: '', phone: '', email: '', description: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de la création.');
    }
  };

  const handleCreateGrp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await groupementService.create(grpForm);
      setShowGrpModal(false);
      setGrpForm({ code: '', name: '', establishmentId: '', description: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de la création.');
    }
  };

  const handleCreateCie = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await compagnieService.create(cieForm);
      setShowCieModal(false);
      setCieForm({ code: '', name: '', groupementId: '', description: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de la création.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            Structure & Hiérarchie Administrative
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Arborescence : Établissements &rarr; Groupements d'Instruction &rarr; Compagnies &rarr; Élèves
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('SUPER_ADMIN', 'ERG_DIRECTOR') && (
            <button
              onClick={() => {
                setFormError(null);
                setShowEstModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nouvel Établissement
            </button>
          )}

          {hasRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR') && (
            <>
              <button
                onClick={() => {
                  setFormError(null);
                  setGrpForm({ ...grpForm, establishmentId: user?.establishmentId || user?.establishment?.id || establishments[0]?.id || '' });
                  setShowGrpModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-institutional-dark text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4 text-institutional-primary" />
                Nouveau Groupement
              </button>

              <button
                onClick={() => {
                  setFormError(null);
                  setShowCieModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-institutional-dark text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4 text-institutional-primary" />
                Nouvelle Compagnie
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Arborescence des Formations Militaires</span>
          <span>{establishments.length} Établissement(s) configuré(s)</span>
        </div>

        <div className="p-4 divide-y divide-slate-100">
          {establishments.map((est) => {
            const isEstExpanded = !!expandedEst[est.id];
            return (
              <div key={est.id} className="py-4 first:pt-0 last:pb-0">
                {/* Level 1: Establishment */}
                <div
                  onClick={() => setExpandedEst({ ...expandedEst, [est.id]: !isEstExpanded })}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition-all border border-slate-200/60"
                >
                  <div className="flex items-center gap-3">
                    {isEstExpanded ? (
                      <ChevronDown className="w-5 h-5 text-institutional-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {est.code}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-institutional-dark">{est.name}</h3>
                      <p className="text-xs text-slate-500">{est.address || 'Aucune adresse renseignée'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-600">
                      <strong>{est.groupements?.length || 0}</strong> Groupements
                    </span>
                    <span className="text-slate-600">
                      <strong>{est._count?.students || 0}</strong> Élèves
                    </span>
                    <Badge variant={est.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm" dot>
                      {est.status === 'ACTIVE' ? 'Opérationnel' : 'Inactif'}
                    </Badge>
                  </div>
                </div>

                {/* Level 2: Groupements under this Establishment */}
                {isEstExpanded && (
                  <div className="mt-3 ml-8 pl-4 border-l-2 border-blue-200 space-y-3">
                    {est.groupements?.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Aucun groupement créé pour cet établissement.
                      </p>
                    ) : (
                      est.groupements?.map((grp) => {
                        const isGrpExpanded = !!expandedGrp[grp.id];
                        return (
                          <div key={grp.id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
                            <div
                              onClick={() => setExpandedGrp({ ...expandedGrp, [grp.id]: !isGrpExpanded })}
                              className="flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                {isGrpExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-institutional-primary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                  {grp.code}
                                </span>
                                <span className="font-bold text-xs text-institutional-dark">{grp.name}</span>
                              </div>
                              <span className="text-xs text-slate-500">
                                <strong>{grp.compagnies?.length || 0}</strong> Compagnies rattachées
                              </span>
                            </div>

                            {/* Level 3: Compagnies under this Groupement */}
                            {isGrpExpanded && (
                              <div className="mt-3 ml-6 pl-3 border-l-2 border-indigo-200 space-y-2 pt-2">
                                {grp.compagnies?.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">Aucune compagnie rattachée.</p>
                                ) : (
                                  grp.compagnies?.map((cie) => (
                                    <div
                                      key={cie.id}
                                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs hover:bg-slate-100/70"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                        <span className="font-semibold text-slate-800">{cie.name}</span>
                                        <span className="font-mono text-[10px] text-slate-400">({cie.code})</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-slate-500 font-medium">
                                          {cie._count?.students || 0} Élèves
                                        </span>
                                        <Badge variant="purple" size="sm">Compagnie active</Badge>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Nouvel Établissement */}
      <Modal
        isOpen={showEstModal}
        onClose={() => setShowEstModal(false)}
        title="Création d’un Nouvel Établissement"
        subtitle="Définit une nouvelle école militaire rattachée à la Direction Générale ERG"
      >
        <form onSubmit={handleCreateEst} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Code Unique (ex: SIGR, CFGR)</label>
              <input
                type="text"
                required
                value={estForm.code}
                onChange={(e) => setEstForm({ ...estForm, code: e.target.value.toUpperCase() })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                placeholder="EXEMPLE"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Nom Complet</label>
              <input
                type="text"
                required
                value={estForm.name}
                onChange={(e) => setEstForm({ ...estForm, name: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
                placeholder="École de Formation..."
              />
            </div>
          </div>
          <div>
            <label className="font-bold text-slate-700 uppercase">Adresse Postale</label>
            <input
              type="text"
              value={estForm.address}
              onChange={(e) => setEstForm({ ...estForm, address: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Téléphone</label>
              <input
                type="text"
                value={estForm.phone}
                onChange={(e) => setEstForm({ ...estForm, phone: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Email de contact</label>
              <input
                type="email"
                value={estForm.email}
                onChange={(e) => setEstForm({ ...estForm, email: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowEstModal(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Enregistrer l’Établissement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Nouveau Groupement */}
      <Modal
        isOpen={showGrpModal}
        onClose={() => setShowGrpModal(false)}
        title="Création d’un Nouveau Groupement"
        subtitle="Rattaché à un établissement d’instruction"
      >
        <form onSubmit={handleCreateGrp} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="font-bold text-slate-700 uppercase">Établissement de rattachement</label>
            <select
              value={grpForm.establishmentId}
              onChange={(e) => setGrpForm({ ...grpForm, establishmentId: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              required
            >
              {establishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name} ({est.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Code (ex: GRP-3)</label>
              <input
                type="text"
                required
                value={grpForm.code}
                onChange={(e) => setGrpForm({ ...grpForm, code: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Nom du Groupement</label>
              <input
                type="text"
                required
                value={grpForm.name}
                onChange={(e) => setGrpForm({ ...grpForm, name: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowGrpModal(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Créer le Groupement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Nouvelle Compagnie */}
      <Modal
        isOpen={showCieModal}
        onClose={() => setShowCieModal(false)}
        title="Création d’une Nouvelle Compagnie"
        subtitle="Rattachement strict à un Groupement existant de l’établissement"
      >
        <form onSubmit={handleCreateCie} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div>
            <label className="font-bold text-slate-700 uppercase">Groupement de rattachement</label>
            <select
              value={cieForm.groupementId}
              onChange={(e) => setCieForm({ ...cieForm, groupementId: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              required
            >
              <option value="">Sélectionner un groupement...</option>
              {establishments.flatMap((est) =>
                (est.groupements || []).map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {est.code} — {grp.name} ({grp.code})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Code Compagnie (ex: CIE-4)</label>
              <input
                type="text"
                required
                value={cieForm.code}
                onChange={(e) => setCieForm({ ...cieForm, code: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Nom de la Compagnie</label>
              <input
                type="text"
                required
                value={cieForm.name}
                onChange={(e) => setCieForm({ ...cieForm, name: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowCieModal(false)}
              className="px-4 py-2 border rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-institutional-primary text-white font-bold rounded-lg hover:bg-blue-700"
            >
              Créer la Compagnie
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
