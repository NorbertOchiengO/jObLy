import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { register, dashboardPathFor } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import AuthLayout from '../../../components/AuthLayout';
import { Field, PasswordField, SubmitButton } from '../../../components/FormFields';

const MIN_PASSWORD = 8; // must match the backend rule

const COMPANY_FIELDS = [
  { name: 'companyName', label: 'Company name' },
  { name: 'position', label: 'Your position' },
  { name: 'type', label: 'Type of company' },
  { name: 'industry', label: 'Industry' },
  { name: 'address', label: 'Address' },
  { name: 'location', label: 'Location' },
  { name: 'city', label: 'City' }
];
const EMPTY_COMPANY = Object.fromEntries(COMPANY_FIELDS.map((f) => [f.name, '']));

const Register = () => {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const from = location.state?.from;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('individual');
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [error, setError] = useState('');
  const [companyTaken, setCompanyTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from || dashboardPathFor(user.role)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setCompanyTaken(false);

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const body = { name, email, password, role, ...(role === 'company' ? company : {}) };
      const { data } = await register(body);
      await signIn(data.token);
    } catch (err) {
      const message = err.response?.data?.message;
      if (message === 'Company already registered') setCompanyTaken(true);
      else setError(message || (err.request ? 'Cannot reach the server. Please try again.' : 'Error registering user'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Register">
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {companyTaken && (
        <div role="alert" className="space-y-3">
          <p className="text-red-600 text-sm">That company is already registered. Would you like to log in instead?</p>
          <Link to="/login" className="block text-center p-2 text-white bg-purple-600 rounded-md hover:bg-purple-700">Log in</Link>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field id="name" label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField id="password" autoComplete="new-password" hint={`At least ${MIN_PASSWORD} characters`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={MIN_PASSWORD} />
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Register as</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
            <option value="individual">Job seeker</option>
            <option value="company">Company</option>
          </select>
        </div>
        {role === 'company' && COMPANY_FIELDS.map((f) => (
          <Field key={f.name} id={f.name} name={f.name} label={f.label} value={company[f.name]} onChange={(e) => setCompany({ ...company, [f.name]: e.target.value })} required />
        ))}
        <SubmitButton loading={submitting} loadingText="Creating account...">Register</SubmitButton>
      </form>
      <p className="text-center text-sm">
        Already have an account? <Link to="/login" state={location.state} className="text-purple-600 underline">Log in</Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
