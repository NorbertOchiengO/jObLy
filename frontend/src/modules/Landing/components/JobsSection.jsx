import { Link } from 'react-router-dom';
import JobItem from '../../Build/Searchengine/JobItem';
import { JobSkeletons } from '../../Build/Searchengine/JobList';
import { getJobs } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';

// Shared by Featured / Latest jobs on the landing page
const JobsSection = ({ title, params, viewAllTo = '/jobs' }) => {
  const { data, loading, error, reload } = useAsync(() => getJobs(params), JSON.stringify(params));
  const jobs = data?.jobs;

  // No featured jobs yet? Don't show an empty section on the home page.
  if (!loading && !error && (!jobs || jobs.length === 0)) return null;

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <Link to={viewAllTo} className="text-primary hover:underline text-sm sm:text-base">Show all jobs &rarr;</Link>
      </div>

      {error ? (
        <div role="alert" className="p-4 border border-red-200 bg-red-50 rounded text-sm text-red-700">
          Couldn&apos;t load jobs right now. <button onClick={reload} className="underline">Try again</button>
        </div>
      ) : loading && !jobs ? (
        <JobSkeletons count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobs.map((job) => <JobItem key={job._id} job={job} />)}
        </div>
      )}
    </section>
  );
};

export default JobsSection;
