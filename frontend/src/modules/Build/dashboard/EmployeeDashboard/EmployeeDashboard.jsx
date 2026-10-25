import DashboardLayout from '../../../../components/DashboardLayout';

const NAV = [
  { to: '/clientdashboard', label: 'My applications', end: true },
  { to: '/clientdashboard/profile', label: 'My profile & CV' },
  { to: '/jobs', label: 'Find jobs' }
];

const EmployeeDashboard = () => (
  <DashboardLayout nav={NAV} subtitle="Track the jobs you have applied for." />
);

export default EmployeeDashboard;
