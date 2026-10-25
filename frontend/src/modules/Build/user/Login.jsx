import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { login, loginWithGoogle, loginWithGitHub, loginWithLinkedIn, dashboardPathFor } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AuthLayout from '../../../components/AuthLayout';
import { Field, PasswordField, SubmitButton } from '../../../components/FormFields';

const Login = () => {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const from = location.state?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(new URLSearchParams(location.search).get('error') === 'oauth' ? 'Social login failed. Please try again.' : '');

  // Already logged in (or just logged in): go back where they were headed, or to their dashboard
  if (user) return <Navigate to={from || dashboardPathFor(user.role)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const { data } = await login({ email, password });
      await signIn(data.token); // role comes from the server
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Cannot reach the server. Please try again.' : 'Could not log in. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Login">
      {from && <p className="text-sm text-gray-600 text-center">Please log in to continue.</p>}
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <SubmitButton loading={submitting} loadingText="Logging in...">Login</SubmitButton>
      </form>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="button" onClick={loginWithGoogle} className="flex-1 flex items-center justify-center p-2 border rounded-md hover:bg-gray-50"><FcGoogle className="mr-2 h-5 w-5" /> Google</button>
        <button type="button" onClick={loginWithGitHub} className="flex-1 flex items-center justify-center p-2 border rounded-md hover:bg-gray-50"><FaGithub className="mr-2 h-5 w-5" /> GitHub</button>
        <button type="button" onClick={loginWithLinkedIn} className="flex-1 flex items-center justify-center p-2 border rounded-md hover:bg-gray-50"><FaLinkedin className="mr-2 h-5 w-5" /> LinkedIn</button>
      </div>
      <p className="text-center text-sm">
        Don&apos;t have an account? <Link to="/register" state={location.state} className="text-purple-600 underline">Register now</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
