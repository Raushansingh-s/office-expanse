import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';

// Layouts
import AppLayout from './layouts/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// App pages
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ExpenseListPage from './pages/expenses/ExpenseListPage';
import AddExpensePage from './pages/expenses/AddExpensePage';
import ExpenseDetailPage from './pages/expenses/ExpenseDetailPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import ReimbursementsPage from './pages/reimbursements/ReimbursementsPage';
import DirectorsPage from './pages/directors/DirectorsPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import ReportsPage from './pages/reports/ReportsPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import UserManagementPage from './pages/users/UserManagementPage';
import CompanyPage from './pages/company/CompanyPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';

// Protected route wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role?.name)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', background: '#1E293B', color: '#F8FAFC', fontSize: '14px', fontFamily: 'Inter, sans-serif' },
          success: { style: { background: '#065F46', color: '#ECFDF5' }, iconTheme: { primary: '#10B981', secondary: '#ECFDF5' } },
          error: { style: { background: '#7F1D1D', color: '#FEF2F2' }, iconTheme: { primary: '#EF4444', secondary: '#FEF2F2' } },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Expenses */}
          <Route path="expenses" element={<ExpenseListPage />} />
          <Route path="expenses/new" element={<AddExpensePage />} />
          <Route path="expenses/:id" element={<ExpenseDetailPage />} />
          <Route path="expenses/:id/edit" element={<AddExpensePage />} />

          {/* Admin routes */}
          <Route path="approvals" element={<PrivateRoute roles={['super_admin','admin']}><ApprovalsPage /></PrivateRoute>} />
          <Route path="reimbursements" element={<ReimbursementsPage />} />
          <Route path="directors" element={<PrivateRoute roles={['super_admin','admin']}><DirectorsPage /></PrivateRoute>} />
          <Route path="employees" element={<PrivateRoute roles={['super_admin','admin']}><EmployeesPage /></PrivateRoute>} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="departments" element={<PrivateRoute roles={['super_admin','admin']}><DepartmentsPage /></PrivateRoute>} />
          <Route path="categories" element={<PrivateRoute roles={['super_admin','admin']}><CategoriesPage /></PrivateRoute>} />
          <Route path="users" element={<PrivateRoute roles={['super_admin','admin']}><UserManagementPage /></PrivateRoute>} />
          <Route path="company" element={<PrivateRoute roles={['super_admin']}><CompanyPage /></PrivateRoute>} />
          <Route path="audit" element={<PrivateRoute roles={['super_admin','admin']}><AuditLogsPage /></PrivateRoute>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<Navigate to="/company" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
