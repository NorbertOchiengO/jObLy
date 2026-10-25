export function timeAgo(date) {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatSalary(job) {
  const { salaryMin, salaryMax, salaryCurrency = 'KES' } = job || {};
  const n = (v) => Number(v).toLocaleString('en-US');
  if (salaryMin && salaryMax) return `${salaryCurrency} ${n(salaryMin)} – ${n(salaryMax)}`;
  if (salaryMin) return `From ${salaryCurrency} ${n(salaryMin)}`;
  if (salaryMax) return `Up to ${salaryCurrency} ${n(salaryMax)}`;
  return '';
}

export const isExpired = (job) => !!job?.deadline && new Date(job.deadline).getTime() < Date.now();
export const isOpen = (job) => job?.status !== 'closed' && !isExpired(job);

// "line one\nline two" -> ['line one', 'line two']
export const toLines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
