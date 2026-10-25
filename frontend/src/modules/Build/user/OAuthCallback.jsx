import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { dashboardPathFor } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) { navigate('/login?error=oauth', { replace: true }); return; }
    signIn(token)
      .then((user) => navigate(dashboardPathFor(user.role), { replace: true }))
      .catch(() => navigate('/login?error=oauth', { replace: true }));
  }, [location.search, navigate, signIn]);

  return <div role="status" className="p-8 text-center">Signing you in...</div>;
};

export default OAuthCallback;
