import { Link } from 'react-router-dom';
import DashboardLayout from '../../../../components/DashboardLayout';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/jobs', label: 'Job listings', end: true },
  { to: '/dashboard/applicants', label: 'All applicants' },
  { to: '/dashboard/profile', label: 'Company profile' },
  { to: '/dashboard/jobs/new', label: 'Post a job' }
];

const EmployerDashboard = () => (
  <DashboardLayout
    nav={NAV}
    subtitle="Here is an overview of your jobs and applicants."
    action={<Link to="/dashboard/jobs/new" className="bg-primary text-white px-4 py-2 rounded hover:opacity-90">Post a job</Link>}
  />
);

export default EmployerDashboard;
