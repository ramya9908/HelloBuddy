
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is admin, redirect to admin dashboard
  if (user.isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If user is regular user, show user dashboard
  return <Navigate to="/user-dashboard" replace />;
};

export default DashboardRedirect;