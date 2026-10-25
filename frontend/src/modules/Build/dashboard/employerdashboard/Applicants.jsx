import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { downloadResume, getMyJobs, getReceivedApplications, updateApplicationStatus } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { formatDate } from '../../../../utils/format';
import { STATUS_LABELS } from '../../../../utils/status';
import { Card, Empty, ErrorBox, Loading } from '../../../../components/PageState';

const SELECT = 'p-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:border-primary';

const Applicants = () => {
  const [params, setParams] = useSearchParams();
  const jobId = params.get('jobId') || '';
  const status = params.get('status') || '';

  const { data, loading, error, reload } = useAsync(() => getReceivedApplications({ jobId, status }), params.toString());
  const jobsState = useAsync(getMyJobs, 'my-jobs');
  const [rowError, setRowError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const changeStatus = async (app, next) => {
    setRowError('');
    setBusyId(app._id);
    try {
      await updateApplicationStatus(app._id, next);
      reload();
    } catch (err) {
      setRowError(err.response?.data?.message || 'Could not update the status.');
    } finally {
      setBusyId(null);
    }
  };

  const download = async (app) => {
    setRowError('');
    try {
      await downloadResume(app._id, app.resume?.originalName || 'resume');
    } catch (err) {
      setRowError('Could not download that resume.');
    }
  };

  return (
    <Card title="All applicants">
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label htmlFor="f-job" className="block text-sm text-gray-600 mb-1">Job</label>
          <select id="f-job" className={SELECT} value={jobId} onChange={(e) => setFilter('jobId', e.target.value)}>
            <option value="">All jobs</option>
            {(jobsState.data?.jobs || []).map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="block text-sm text-gray-600 mb-1">Status</label>
          <select id="f-status" className={SELECT} value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Any status</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {rowError && <p role="alert" className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{rowError}</p>}

      {loading && !data ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data.applications.length === 0 ? (
        <Empty title="No applicants found">{jobId || status ? 'Try removing a filter.' : 'When someone applies to one of your jobs, they will show up here.'}</Empty>
      ) : (
        <ul className="divide-y">
          {data.applications.map((a) => (
            <li key={a._id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.fullName}</p>
                  <p className="text-sm text-gray-600 break-all">
                    <a href={`mailto:${a.email}`} className="hover:text-primary">{a.email}</a>{a.phone ? ` · ${a.phone}` : ''}
                  </p>
                  {a.applicant?.profile?.headline && <p className="text-sm text-gray-800">{a.applicant.profile.headline}</p>}
                  <p className="text-sm text-gray-500">{a.job?.title} · Applied {formatDate(a.createdAt)}</p>
                  {a.applicant?.profile?.skills?.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-1.5" aria-label={`Skills of ${a.fullName}`}>
                      {a.applicant.profile.skills.slice(0, 6).map((s) => <li key={s} className="bg-purple-50 text-primary text-xs font-semibold px-2 py-0.5 rounded">{s}</li>)}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`st-${a._id}`}>Status for {a.fullName}</label>
                  <select
                    id={`st-${a._id}`}
                    className={SELECT}
                    value={a.status}
                    disabled={busyId === a._id}
                    onChange={(e) => changeStatus(a, e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {a.resume?.originalName && (
                    <button onClick={() => download(a)} className="px-3 py-2 border rounded-md hover:bg-gray-50">Download resume</button>
                  )}
                </div>
              </div>
              {a.coverLetter && (
                <details className="mt-2 text-sm text-gray-700">
                  <summary className="cursor-pointer text-primary">Cover letter</summary>
                  <p className="mt-2 whitespace-pre-line">{a.coverLetter}</p>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default Applicants;
