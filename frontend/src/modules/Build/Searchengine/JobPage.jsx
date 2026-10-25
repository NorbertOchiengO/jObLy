import { Link, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import SingleJobViewer from './SingleJobViewer';
import { getJob, getMyApplications } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useAsync } from '../../../hooks/useAsync';

const JobPage = () => {
  const { id } = useParams();
  const { data: job, loading, error, reload } = useAsync(() => getJob(id), id);
  const { user } = useAuth();

  // Has this job seeker already applied? (only asked for logged-in job seekers)
  const mine = useAsync(
    () => (user?.role === 'individual' ? getMyApplications({ jobId: id }) : Promise.resolve(null)),
    `${id}:${user?._id || 'anon'}`
  );
  const applied = (mine.data?.applications?.length || 0) > 0;

  let body;
  if (loading) {
    body = (
      <div role="status" aria-label="Loading job" className="bg-white p-8 rounded-lg shadow animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-24 bg-gray-200 rounded" />
      </div>
    );
  } else if (error) {
    const notFound = /not found|invalid job id/i.test(error);
    body = (
      <div role="alert" className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-lg font-semibold">{notFound ? "This job doesn't exist or was removed." : "We couldn't load this job."}</p>
        {!notFound && <p className="text-gray-500 text-sm mt-1">{error}</p>}
        <div className="mt-4 flex justify-center gap-3">
          {!notFound && <button onClick={reload} className="bg-primary text-white py-2 px-4 rounded">Try again</button>}
          <Link to="/jobs" className="border border-primary text-primary py-2 px-4 rounded">Browse jobs</Link>
        </div>
      </div>
    );
  } else {
    body = <SingleJobViewer job={job} applied={applied} />;
  }

  return <Layout>{body}</Layout>;
};

export default JobPage;
