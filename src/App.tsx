// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminProtectedRoute from './components/common/AdminProtectedRoute';
import DashboardRedirect from './components/common/DashboardRedirect';

// Lazy load components for better performance
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const VerifyLogin = lazy(() => import('./pages/auth/VerifyLogin'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const WithdrawEarnings = lazy(() => import('./pages/user/WithdrawEarnings'));
const WithdrawalHistory = lazy(() => import('./pages/user/WithdrawalHistory'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminBatches = lazy(() => import('./pages/admin/AdminBatches'));
const AdminClickApproval = lazy(() => import('./pages/admin/AdminClickApproval'));
const AdminWithdrawals = lazy(() => import('./pages/admin/AdminWithdrawals'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '14px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-login" element={<VerifyLogin />} />
                       
            {/* Smart Dashboard Redirect */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            
            {/* Protected User Routes */}
            <Route path="/user-dashboard" element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/withdraw" element={
              <ProtectedRoute>
                <WithdrawEarnings />
              </ProtectedRoute>
            } />
            <Route path="/withdrawal-history" element={
              <ProtectedRoute>
                <WithdrawalHistory />
              </ProtectedRoute>
            } />
                       
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            } />
            <Route path="/admin/posts" element={
              <AdminProtectedRoute>
                <AdminPosts />
              </AdminProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <AdminProtectedRoute>
                <AdminUsers />
              </AdminProtectedRoute>
            } />
            <Route path="/admin/batches" element={
              <AdminProtectedRoute>
                <AdminBatches />
              </AdminProtectedRoute>
            } />
            <Route path="/admin/click-approval" element={
              <AdminProtectedRoute>
                <AdminClickApproval />
              </AdminProtectedRoute>
            } />
            <Route path="/admin/withdrawals" element={
              <AdminProtectedRoute>
                <AdminWithdrawals />
              </AdminProtectedRoute>
            } />
                       
            {/* Redirect and 404 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;