import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteJob, getMyJobs, updateJob } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { formatDate, isExpired } from '../../../../utils/format';
import StatusBadge from '../../../../components/StatusBadge';
import { Card, Empty, ErrorBox, Loading } from '../../../../components/PageState';

const JobListings = () => {
  const { data, loading, error, reload } = useAsync(getMyJobs, 'my-jobs');
  const [confirmId, setConfirmId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');

  const run = async (id, fn) => {
    setActionError('');
    setBusyId(id);
    try {
      await fn();
      setConfirmId(null);
      reload();
    } catch (err) {
      setActionError(err.response?.data?.message || 'That did not work. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  const jobs = data.jobs;
  if (jobs.length === 0) {
    return (
      <Empty title="You haven't posted any jobs yet">
        <Link to="/dashboard/jobs/new" className="inline-block mt-3 bg-primary text-white py-2 px-4 rounded">Post a job</Link>
      </Empty>
    );
  }

  const btn = 'text-sm px-2 py-1 rounded border hover:bg-gray-50 disabled:opacity-50';

  return (
    <Card title="Job listings">
      {actionError && <p role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{actionError}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="py-2 pr-4">Job</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Posted</th>
              <th className="py-2 pr-4">Applicants</th><th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const expired = isExpired(j);
              const state = j.status === 'closed' ? 'closed' : expired ? 'expired' : 'open';
              return (
                <tr key={j._id} className="border-b last:border-0 align-top">
                  <td className="py-3 pr-4">
                    <Link to={`/job/${j._id}`} className="font-semibold hover:text-primary">{j.title}</Link>
                    <p className="text-gray-500">{j.location}</p>
                  </td>
                  <td className="py-3 pr-4"><StatusBadge status={state} label={state[0].toUpperCase() + state.slice(1)} /></td>
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(j.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <Link to={`/dashboard/applicants?jobId=${j._id}`} className="text-primary hover:underline">{j.applicationCount}</Link>
                  </td>
                  <td className="py-3">
                    {confirmId === j._id ? (
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-red-700">Delete this job and its applications?</span>
                        <button className={`${btn} text-red-700 border-red-300`} disabled={busyId === j._id} onClick={() => run(j._id, () => deleteJob(j._id))}>Yes, delete</button>
                        <button className={btn} onClick={() => setConfirmId(null)}>Cancel</button>
                      </span>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        <Link to={`/dashboard/jobs/${j._id}/edit`} className={btn}>Edit</Link>
                        <button
                          className={btn}
                          disabled={busyId === j._id}
                          onClick={() => run(j._id, () => updateJob(j._id, { status: j.status === 'closed' ? 'open' : 'closed' }))}
                        >
                          {j.status === 'closed' ? 'Reopen' : 'Close'}
                        </button>
                        <button className={`${btn} text-red-700`} onClick={() => setConfirmId(j._id)}>Delete</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default JobListings;
