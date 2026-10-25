import JobsSection from './JobsSection';

const PARAMS = { sort: 'newest', limit: 8 };

const LatestJobs = () => <JobsSection title="Latest Jobs Open" params={PARAMS} />;

export default LatestJobs;
