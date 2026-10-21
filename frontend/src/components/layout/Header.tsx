import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  UserCheck,
  ChevronDown,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationService, authService } from '../../services/api';
import { NotificationItem } from '../../types';

export const Header: React.FC = () => {
  const { user, switchUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    authService.getDemoAccounts().then((res) => setDemoAccounts(res.data)).catch(() => {});
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data);
    } catch (e) {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      // ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Institution Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-institutional-primary font-bold text-xs">
            {user?.establishment?.code || 'ERG'}
          </div>
          <div>
            <h2 className="text-sm font-bold text-institutional-dark leading-tight">
              {user?.establishment?.name || 'Administration Générale (Gestion ERG)'}
            </h2>
            <p className="text-xs text-slate-500">
              Système Centralisé de Gestion des Écoles Militaires
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Fast Role Switcher (Crucial for Demo & Testing) */}
        <button
          onClick={() => setShowSwitchModal(!showSwitchModal)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-institutional-primary rounded-xl text-xs font-semibold hover:bg-blue-100/70 shadow-sm transition-all"
          title="Changer de compte instantanément pour tester les différents profils et droits hiérarchiques"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>Changer de rôle (Démo)</span>
          <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-institutional-primary hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-dropdown border border-slate-100 overflow-hidden z-30">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs font-bold text-slate-800">Notifications ({unreadCount} non lues)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-institutional-primary hover:underline font-medium"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Aucune notification pour le moment.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs flex gap-3 ${n.isRead ? 'bg-white opacity-75' : 'bg-blue-50/40'}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {n.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : n.type === 'DANGER' ? (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{n.title}</p>
                        <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right">
            <p className="text-xs font-bold text-institutional-dark leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-slate-500">{user?.role.name}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-institutional-dark text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
        </div>
      </div>

      {/* Demo Switch Modal Dropdown */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-6 pt-20 bg-black/20 backdrop-blur-xs">
          <div className="w-96 bg-white rounded-2xl shadow-dropdown border border-slate-100 overflow-hidden">
            <div className="p-4 bg-institutional-dark text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Sélecteur de Profil Démo</h4>
                <p className="text-xs text-blue-200">Testez le workflow et les droits en 1-clic</p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-white/70 hover:text-white text-xs px-2 py-1 rounded bg-white/10"
              >
                Fermer
              </button>
            </div>
            <div className="p-3 max-h-[480px] overflow-y-auto space-y-1.5 divide-y divide-slate-100">
              {demoAccounts.map((acc, idx) => {
                const isCurrent = user?.email === acc.email;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowSwitchModal(false);
                      switchUser(acc.email, acc.password);
                    }}
                    className={`w-full pt-2 first:pt-0 text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                      isCurrent
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {acc.roleCode === 'STUDENT' ? (
                        <GraduationCap className="w-4 h-4" />
                      ) : acc.roleCode.includes('DIRECTOR') ? (
                        <Building className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-institutional-dark truncate">
                          {acc.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                            Actuel
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-institutional-primary">
                        {acc.roleName}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {acc.establishment} {acc.compagnie ? `• ${acc.compagnie}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
