import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CalendarX,
  Award,
  ShieldCheck,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasRole, isStudent } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: '/hierarchie',
      label: 'Structures & Écoles',
      icon: Building2,
      show: hasRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ERG_SECRETARY', 'ESTABLISHMENT_DIRECTOR'),
    },
    {
      to: '/eleves',
      label: isStudent ? 'Mon Profil & Dossier' : 'Gestion des Élèves',
      icon: Users,
      show: true,
    },
    {
      to: '/demandes',
      label: isStudent ? 'Mes Demandes' : 'Demandes & Circuit',
      icon: FileText,
      show: true,
    },
    {
      to: '/absences',
      label: isStudent ? 'Mes Absences' : 'Suivi des Absences',
      icon: CalendarX,
      show: true,
    },
    {
      to: '/notes',
      label: isStudent ? 'Mes Notes & Résultats' : 'Notes & Évaluations',
      icon: Award,
      show: true,
    },
    {
      to: '/utilisateurs',
      label: 'Comptes & Droits',
      icon: ShieldCheck,
      show: hasRole('SUPER_ADMIN', 'ERG_DIRECTOR', 'ESTABLISHMENT_DIRECTOR'),
    },
    {
      to: '/audit',
      label: 'Journaux d’Audit',
      icon: History,
      show: hasRole('SUPER_ADMIN'),
    },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-institutional-dark text-white border-r border-slate-800 transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-white/10 gap-3">
        <div className="w-10 h-10 rounded-xl bg-institutional-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-white block leading-tight">
              GESTION ÉCOLES
            </span>
            <span className="text-[10px] text-blue-300 tracking-wider font-semibold block uppercase">
              Administration Militaire
            </span>
          </div>
        )}
      </div>

      {/* User Scope Banner */}
      {!collapsed && (
        <div className="px-4 py-3 bg-white/5 border-b border-white/10 text-xs">
          <p className="text-[10px] uppercase font-semibold text-blue-300 tracking-wider">
            {user.role.name}
          </p>
          <p className="font-medium text-slate-200 truncate mt-0.5">
            {user.establishment?.name || 'Administration Générale'}
          </p>
          {user.compagnie && (
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <Layers className="w-3 h-3 text-blue-400" />
              {user.compagnie.name}
            </p>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-institutional-primary text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Déconnexion"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>

        {/* Toggle Collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
