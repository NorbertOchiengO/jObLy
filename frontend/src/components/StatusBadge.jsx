import { STATUS_LABELS } from '../utils/status';

const STYLES = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
  expired: 'bg-amber-100 text-amber-700'
};

const StatusBadge = ({ status, label }) => (
  <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap ${STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
    {label || STATUS_LABELS[status] || status}
  </span>
);

export default StatusBadge;
