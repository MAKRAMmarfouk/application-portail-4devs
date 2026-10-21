import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  CalendarX,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/api';
import { Badge } from '../../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-institutional-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const COLORS = ['#1D4ED8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-institutional-dark via-slate-900 to-blue-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Espace : {user?.role.name}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Bienvenue, {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            {user?.establishment?.name || 'Administration Générale (ERG)'}
            {user?.compagnie ? ` — ${user.compagnie.name}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/demandes"
            className="px-5 py-2.5 bg-institutional-primary hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Accéder aux Demandes
          </Link>
        </div>
      </div>

      {/* 1. SUPER ADMIN VIEW */}
      {user?.role.code === 'SUPER_ADMIN' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Établissements"
              value={data?.metrics?.establishments || 0}
              icon={Building2}
              badge="Actifs"
              badgeVariant="success"
            />
            <StatCard
              title="Utilisateurs & Cadres"
              value={data?.metrics?.users || 0}
              icon={Users}
              badge="Tous rôles"
              badgeVariant="primary"
            />
            <StatCard
              title="Effectif Total Élèves"
              value={data?.metrics?.students || 0}
              icon={Award}
              badge="Promotion 2026"
              badgeVariant="purple"
            />
            <StatCard
              title="Demandes en cours"
              value={data?.metrics?.pendingRequests || 0}
              icon={Clock}
              badge="En circuit"
              badgeVariant="warning"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
              <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide mb-4">
                Répartition des Élèves par Établissement
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.distribution || []}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="students" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
              <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide mb-4">
                Dernières Actions d’Audit
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data?.recentAudits?.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800">{log.action}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {log.user?.firstName} {log.user?.lastName} ({log.userRole})
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. GESTION ERG (ADMINISTRATION GÉNÉRALE) */}
      {['ERG_DIRECTOR', 'ERG_SECRETARY'].includes(user?.role.code || '') && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Établissements Supervisés"
              value={data?.metrics?.totalEstablishments || 0}
              icon={Building2}
              badge="SIGR, CFGR, EFQGR"
              badgeVariant="primary"
            />
            <StatCard
              title="Effectif Global National"
              value={data?.metrics?.totalStudents || 0}
              icon={Users}
              badge="Toutes écoles"
              badgeVariant="success"
            />
            <StatCard
              title="Demandes Requérant Décision ERG"
              value={data?.metrics?.pendingDecisions || 0}
              icon={AlertTriangle}
              badge="Priorité haute"
              badgeVariant="warning"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
            <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide mb-4">
              Situation des Établissements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data?.establishments?.map((est: any) => (
                <div key={est.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                      {est.code}
                    </span>
                    <Badge variant="success" size="sm" dot>Actif</Badge>
                  </div>
                  <h4 className="font-bold text-institutional-dark text-sm mt-3">{est.name}</h4>
                  <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-3 text-center text-xs">
                    <div>
                      <p className="text-slate-400 text-[10px]">Groupements</p>
                      <p className="font-bold text-slate-700">{est._count.groupements}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Élèves</p>
                      <p className="font-bold text-slate-700">{est._count.students}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Demandes</p>
                      <p className="font-bold text-slate-700">{est._count.requests}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 3. DIRECTION D'ÉTABLISSEMENT */}
      {user?.role.code === 'ESTABLISHMENT_DIRECTOR' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Élèves de l’École"
              value={data?.metrics?.totalStudents || 0}
              icon={Users}
              badge="Effectif actif"
              badgeVariant="primary"
            />
            <StatCard
              title="Groupements & Compagnies"
              value={`${data?.metrics?.groupements || 0} / ${data?.metrics?.compagnies || 0}`}
              icon={Building2}
              badge="Structures"
              badgeVariant="neutral"
            />
            <StatCard
              title="Demandes Awaiting Direction"
              value={data?.metrics?.pendingDirectionValidation || 0}
              icon={Clock}
              badge="Validation finale"
              badgeVariant="warning"
            />
            <StatCard
              title="Absences Enregistrées"
              value={data?.metrics?.totalAbsences || 0}
              icon={CalendarX}
              badge="Ce semestre"
              badgeVariant="danger"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
            <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide mb-4">
              Structures Internes de l'École ({data?.establishment?.code})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.groupements?.map((grp: any) => (
                <div key={grp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-institutional-dark">{grp.name}</span>
                    <span className="text-xs font-mono text-slate-500 font-semibold">{grp.code}</span>
                  </div>
                  <div className="mt-3 flex gap-6 text-xs text-slate-600">
                    <span>Compagnies : <strong>{grp._count.compagnies}</strong></span>
                    <span>Élèves rattachés : <strong>{grp._count.students}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 4. COMPAGNIE (RESPONSABLE & CHEF SECRÉTAIRE) */}
      {['COMPAGNIE_RESPONSIBLE', 'COMPAGNIE_SECRETARY'].includes(user?.role.code || '') && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Élèves de la Compagnie"
              value={data?.metrics?.totalStudents || 0}
              icon={Users}
              badge={data?.compagnie?.code || 'Compagnie'}
              badgeVariant="primary"
            />
            <StatCard
              title="Demandes à Traiter"
              value={data?.metrics?.pendingRequests || 0}
              icon={FileText}
              badge="Au niveau compagnie"
              badgeVariant="warning"
            />
            <StatCard
              title="Notes en attente"
              value={data?.metrics?.pendingGrades || 0}
              icon={Award}
              badge="À valider"
              badgeVariant="purple"
            />
            <StatCard
              title="Absences enregistrées"
              value={data?.metrics?.totalAbsences || 0}
              icon={CalendarX}
              badge="Total"
              badgeVariant="danger"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide">
                Dernières Demandes Reçues des Élèves
              </h3>
              <Link to="/demandes" className="text-xs text-institutional-primary font-semibold hover:underline">
                Voir toutes les demandes &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {data?.recentRequests?.map((req: any) => (
                <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-700">{req.trackingNumber}</span>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="font-semibold text-slate-900">{req.student?.firstName} {req.student?.lastName}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{req.subject}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={req.status === 'VALIDEE_DEFINITIVEMENT' ? 'success' : 'warning'} size="sm">
                      {req.status}
                    </Badge>
                    <Link
                      to={`/demandes/${req.id}`}
                      className="p-1 text-slate-400 hover:text-institutional-primary"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 5. ÉLÈVE PORTAL */}
      {user?.role.code === 'STUDENT' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Mes Demandes Déposées"
              value={data?.metrics?.totalRequests || 0}
              icon={FileText}
              badge={`${data?.metrics?.pendingRequests || 0} en instruction`}
              badgeVariant="warning"
            />
            <StatCard
              title="Mes Absences"
              value={data?.metrics?.totalAbsences || 0}
              icon={CalendarX}
              badge="Heures enregistrées"
              badgeVariant="neutral"
            />
            <StatCard
              title="Notations Validées"
              value={data?.metrics?.validatedGradesCount || 0}
              icon={Award}
              badge="Disponibles"
              badgeVariant="success"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide">
                  Mes Demandes en Cours
                </h3>
                <Link to="/demandes" className="text-xs text-institutional-primary font-semibold hover:underline">
                  Nouvelle demande +
                </Link>
              </div>
              <div className="space-y-3">
                {data?.requests?.map((req: any) => (
                  <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-institutional-dark">{req.trackingNumber}</span>
                      <Badge variant={req.status === 'VALIDEE_DEFINITIVEMENT' ? 'success' : req.status === 'REFUSEE' ? 'danger' : 'warning'} size="sm">
                        {req.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">{req.subject}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Étape actuelle : {req.currentStep}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-card">
              <h3 className="text-sm font-bold text-institutional-dark uppercase tracking-wide mb-4">
                Mes Dernières Notes Validées
              </h3>
              <div className="space-y-2">
                {data?.grades?.map((g: any) => (
                  <div key={g.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{g.assessment?.title}</p>
                      <p className="text-slate-500 text-[11px]">{g.assessment?.subject?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-institutional-primary">
                        {g.score} / {g.assessment?.maxScore || 20}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, badge, badgeVariant = 'neutral' }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</span>
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
        <Icon className="w-5 h-5 text-institutional-primary" />
      </div>
    </div>
    <div className="mt-3 flex items-baseline justify-between">
      <span className="text-2xl font-extrabold text-institutional-dark tracking-tight">{value}</span>
      {badge && <Badge variant={badgeVariant} size="sm">{badge}</Badge>}
    </div>
  </div>
);
