import JobItem from './JobItem';

const Skeleton = () => (
  <div className="border bg-white p-4 rounded-lg animate-pulse" aria-hidden="true">
    <div className="flex gap-3">
      <div className="h-12 w-12 rounded-lg bg-gray-200" />
      <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
    </div>
    <div className="mt-4 space-y-2"><div className="h-3 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div>
  </div>
);

export const JobSkeletons = ({ count = 6 }) => (
  <div role="status" aria-label="Loading jobs" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => <Skeleton key={i} />)}
  </div>
);

const JobList = ({ jobs, loading, error, onRetry, onClear, hasFilters }) => {
  if (error) {
    return (
      <div role="alert" className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-700 font-medium">We couldn&apos;t load jobs.</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button onClick={onRetry} className="mt-4 bg-primary text-white py-2 px-4 rounded">Try again</button>
      </div>
    );
  }

  if (loading && !jobs) return <JobSkeletons />;

  if (!jobs || jobs.length === 0) {
    return (
      <div className="p-8 border border-dashed rounded-lg text-center bg-white">
        <p className="text-lg font-semibold">No jobs found</p>
        <p className="text-gray-500 mt-1">
          {hasFilters ? 'Try a different keyword or remove some filters.' : 'No jobs have been posted yet. Check back soon.'}
        </p>
        {hasFilters && <button onClick={onClear} className="mt-4 bg-primary text-white py-2 px-4 rounded">Clear filters</button>}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {jobs.map((job) => <JobItem key={job._id || job.id} job={job} />)}
    </div>
  );
};

export default JobList;
