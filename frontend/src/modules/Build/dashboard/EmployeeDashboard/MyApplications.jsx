import { Link } from 'react-router-dom';
import { getMyApplications } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { formatDate } from '../../../../utils/format';
import StatusBadge from '../../../../components/StatusBadge';
import { Card, Empty, ErrorBox, Loading, Stat } from '../../../../components/PageState';

const MyApplications = () => {
  const { data, loading, error, reload } = useAsync(getMyApplications, 'mine');

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const apps = data.applications;
  const count = (s) => apps.filter((a) => a.status === s).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat value={apps.length} label="Applications" />
        <Stat value={count('under_review')} label="Under review" />
        <Stat value={count('shortlisted')} label="Shortlisted" />
        <Stat value={count('rejected')} label="Rejected" />
      </div>

      <Card title="Your applications">
        {apps.length === 0 ? (
          <Empty title="You haven't applied for any jobs yet">
            <Link to="/jobs" className="inline-block mt-3 bg-primary text-white py-2 px-4 rounded">Browse jobs</Link>
          </Empty>
        ) : (
          <ul className="divide-y">
            {apps.map((a) => (
              <li key={a._id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {a.job ? (
                    <Link to={`/job/${a.job._id}`} className="font-semibold hover:text-primary">{a.job.title}</Link>
                  ) : (
                    <span className="font-semibold text-gray-500">Job no longer available</span>
                  )}
                  <p className="text-sm text-gray-500">{a.job?.company} · Applied {formatDate(a.createdAt)}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default MyApplications;
