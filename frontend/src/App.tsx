import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { HierarchyPage } from './pages/hierarchy/HierarchyPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { RequestsPage } from './pages/requests/RequestsPage';
import { AbsencesPage } from './pages/absences/AbsencesPage';
import { GradesPage } from './pages/grades/GradesPage';
import { UsersPage } from './pages/users/UsersPage';
import { AuditPage } from './pages/audit/AuditPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="hierarchie" element={<HierarchyPage />} />
              <Route path="eleves" element={<StudentsPage />} />
              <Route path="demandes" element={<RequestsPage />} />
              <Route path="demandes/:id" element={<RequestsPage />} />
              <Route path="absences" element={<AbsencesPage />} />
              <Route path="notes" element={<GradesPage />} />
              <Route path="utilisateurs" element={<UsersPage />} />
              <Route path="audit" element={<AuditPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
