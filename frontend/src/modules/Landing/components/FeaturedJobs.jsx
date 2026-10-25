import JobsSection from './JobsSection';

const PARAMS = { featured: 'true', limit: 4 };

const FeaturedJobs = () => <JobsSection title="Featured Jobs" params={PARAMS} />;

export default FeaturedJobs;
