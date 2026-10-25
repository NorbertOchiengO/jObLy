import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathFor } from '../services/api';

// Wrap a page: logged-out users go to /login (and come back here afterwards);
// users with the wrong role go to their own dashboard.
const ProtectedRoute = ({ role, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div role="status" className="p-8 text-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to={dashboardPathFor(user.role)} replace />;
  return children;
};

export default ProtectedRoute;
