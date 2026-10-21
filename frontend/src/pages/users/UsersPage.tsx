import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Mail,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService, establishmentService } from '../../services/api';
import { User, Role, Establishment } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const UsersPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleCode: 'COMPAGNIE_SECRETARY',
    phone: '',
    establishmentId: '',
    groupementId: '',
    compagnieId: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, estRes] = await Promise.all([
        userService.getAll(),
        userService.getRoles(),
        establishmentService.getAll(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      setEstablishments(estRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await userService.toggleStatus(userId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de la modification du statut.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await userService.create(newUser);
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Erreur lors de la création du compte.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            Comptes Utilisateurs & Droits Hiérarchiques
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administration des accès RBAC et isolation stricte par établissement
          </p>
        </div>

        {hasRole('SUPER_ADMIN') && (
          <button
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-institutional-primary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Créer un Compte
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Adresse Email</th>
                <th className="py-3 px-4">Rôle & Niveau</th>
                <th className="py-3 px-4">Établissement / Structure</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {u.firstName} {u.lastName}
                    </div>
                    {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-institutional-dark">{u.role.name}</span>
                    <span className="block text-[10px] font-mono text-blue-600 font-bold">
                      Niveau {u.role.level}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700">
                      {u.establishment?.code || 'Administration Centrale'}
                    </span>
                    {u.compagnie && (
                      <span className="block text-[10px] text-slate-400">{u.compagnie.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.isActive ? 'success' : 'danger'} size="sm" dot>
                      {u.isActive ? 'Actif' : 'Désactivé'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {hasRole('SUPER_ADMIN') && (
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          u.isActive
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.isActive ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Créer un Compte */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Création d'un Nouveau Compte Utilisateur"
        subtitle="Attribution du rôle et rattachement hiérarchique"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Prénom</label>
              <input
                type="text"
                required
                value={newUser.firstName}
                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Nom</label>
              <input
                type="text"
                required
                value={newUser.lastName}
                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 uppercase">Adresse Email</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="officier@ecoles.gov"
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 uppercase">Mot de passe provisoire</label>
              <input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Rôle Attribué</label>
            <select
              value={newUser.roleCode}
              onChange={(e) => setNewUser({ ...newUser, roleCode: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name} (Niveau {r.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 uppercase">Établissement rattaché (si applicable)</label>
            <select
              value={newUser.establishmentId}
              onChange={(e) => setNewUser({ ...newUser, establishmentId: e.target.value })}
              className="mt-1 block w-full p-2.5 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Aucun / Administration Générale</option>
              {establishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.code} — {est.name}
                </option>
              ))}
            </select>
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
              Créer l'Utilisateur
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
