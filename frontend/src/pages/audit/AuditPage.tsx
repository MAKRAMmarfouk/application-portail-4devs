import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/api';
import { AuditLogItem } from '../../types';
import { Badge } from '../../components/common/Badge';

export const AuditPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [moduleFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.getAll({
        module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        limit: 100,
      });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!hasRole('SUPER_ADMIN')) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <Shield className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Accès Réservé au Super Administrateur</h2>
        <p className="text-xs text-slate-500 mt-1">
          La consultation des journaux de sécurité et d'audit requiert les privilèges de niveau 100.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-institutional-dark tracking-tight">
            Journaux d’Audit & Sécurité Système
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Historique inaltérable des opérations sensibles, connexions et décisions hiérarchiques ({total} entrées)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Tous les modules</option>
            <option value="AUTH">Authentification (Connexions/Déconnexions)</option>
            <option value="WORKFLOW">Circuits de Demandes & Visas</option>
            <option value="GRADES">Notations & Rectifications</option>
            <option value="ABSENCES">Absences</option>
            <option value="STUDENTS">Gestion Élèves</option>
            <option value="HIERARCHY">Hiérarchie & Écoles</option>
            <option value="USERS">Gestion Utilisateurs</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Action Enregistrée</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Acteur & Rôle</th>
                <th className="py-3 px-4">Adresse IP</th>
                <th className="py-3 px-4">Détails de l'opération</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 font-bold text-institutional-dark">{log.action}</td>
                  <td className="py-3 px-4">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-sans font-bold text-[10px]">
                      {log.module}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <span className="font-semibold text-slate-800">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {log.userRole || 'ANONYMOUS'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="py-3 px-4 max-w-xs text-slate-600 truncate font-sans text-xs">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
