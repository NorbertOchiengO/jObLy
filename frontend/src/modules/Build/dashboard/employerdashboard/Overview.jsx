import { Link } from 'react-router-dom';
import { getMyJobs, getReceivedApplications } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { formatDate, isOpen } from '../../../../utils/format';
import StatusBadge from '../../../../components/StatusBadge';
import { STATUS_LABELS } from '../../../../utils/status';
import { Card, Empty, ErrorBox, Loading, Stat } from '../../../../components/PageState';

const BAR = { submitted: 'bg-blue-500', under_review: 'bg-yellow-400', shortlisted: 'bg-green-500', rejected: 'bg-red-500' };

const Overview = () => {
  const { data, loading, error, reload } = useAsync(
    async () => {
      const [jobs, apps] = await Promise.all([getMyJobs(), getReceivedApplications()]);
      return { jobs: jobs.jobs, apps: apps.applications };
    },
    'overview'
  );

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const { jobs, apps } = data;
  if (jobs.length === 0) {
    return (
      <Empty title="You haven't posted any jobs yet">
        <p>Post your first job and applicants will show up here.</p>
        <Link to="/dashboard/jobs/new" className="inline-block mt-3 bg-primary text-white py-2 px-4 rounded">Post a job</Link>
      </Empty>
    );
  }

  const count = (s) => apps.filter((a) => a.status === s).length;
  const openJobs = jobs.filter(isOpen).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={openJobs} label="Open jobs" />
        <Stat value={apps.length} label="Total applicants" />
        <Stat value={count('submitted')} label="New to review" />
        <Stat value={count('shortlisted')} label="Shortlisted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Applicants by status">
          {apps.length === 0 ? (
            <p className="text-gray-500">No applications yet.</p>
          ) : (
            <>
              <div className="flex h-3 rounded overflow-hidden mb-4" role="img" aria-label="Applicants by status">
                {Object.keys(STATUS_LABELS).map((s) => (
                  <div key={s} className={BAR[s]} style={{ width: `${(count(s) / apps.length) * 100}%` }} />
                ))}
              </div>
              <ul className="space-y-1 text-sm">
                {Object.entries(STATUS_LABELS).map(([s, label]) => (
                  <li key={s} className="flex items-center justify-between">
                    <span className="flex items-center"><span className={`w-3 h-3 rounded-full mr-2 ${BAR[s]}`} />{label}</span>
                    <span className="font-bold">{count(s)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Recent applicants">
          {apps.length === 0 ? (
            <p className="text-gray-500">When someone applies, they will appear here.</p>
          ) : (
            <>
              <ul className="divide-y">
                {apps.slice(0, 5).map((a) => (
                  <li key={a._id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{a.fullName}</p>
                      <p className="text-sm text-gray-500 truncate">{a.job?.title} · {formatDate(a.createdAt)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
              <Link to="/dashboard/applicants" className="inline-block mt-3 text-primary hover:underline">See all applicants &rarr;</Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Overview;
