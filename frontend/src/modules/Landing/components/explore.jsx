import { Link } from 'react-router-dom';
import {
  FaPaintBrush, FaChartLine, FaBullhorn, FaCalculator, FaLaptopCode, FaCog, FaBriefcase, FaUsers,
  FaHeartbeat, FaGraduationCap, FaTruck, FaHeadset
} from 'react-icons/fa';
import dashboard from '../../../assets/dashboard.png';
import { getJobMeta } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';

const ICONS = {
  Design: FaPaintBrush, Sales: FaChartLine, Marketing: FaBullhorn, Finance: FaCalculator, Technology: FaLaptopCode,
  Engineering: FaCog, Business: FaBriefcase, 'Human Resources': FaUsers, Healthcare: FaHeartbeat,
  Education: FaGraduationCap, Logistics: FaTruck, 'Customer Service': FaHeadset
};

// Categories and counts come from the jobs that are actually open right now
const Explore = () => {
  const { data, loading, error, reload } = useAsync(getJobMeta, 'explore-meta');
  const categories = (data?.industryCounts || []).slice(0, 8);

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold">
            Explore by <span className="text-purple-500">category</span>
          </h2>
          <Link to="/jobs" className="text-purple-500 whitespace-nowrap">Show all jobs &rarr;</Link>
        </div>

        {error ? (
          <div role="alert" className="p-4 border border-red-200 bg-red-50 rounded text-sm text-red-700">
            Couldn&apos;t load categories right now. <button onClick={reload} className="underline">Try again</button>
          </div>
        ) : loading && !data ? (
          <div role="status" aria-label="Loading categories" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 border rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : categories.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map(({ name, count }) => {
              const Icon = ICONS[name] || FaBriefcase;
              return (
                <li key={name}>
                  <Link
                    to={`/jobs?industry=${encodeURIComponent(name)}`}
                    className="h-full p-6 border rounded-lg flex flex-col items-center justify-between text-center hover:bg-primary hover:text-white transition-colors duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Icon className="h-12 w-12 mb-4" aria-hidden="true" />
                    <h3 className="text-xl font-semibold">{name}</h3>
                    <p className="text-gray-500 group-hover:text-white">{count} {count === 1 ? 'job' : 'jobs'} available &rarr;</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-16 bg-primary text-white p-8 rounded-lg flex flex-col lg:flex-row items-center justify-between">
          <div className="mb-8 lg:mb-0 lg:mr-8">
            <h3 className="text-3xl font-bold">Start posting jobs today</h3>
            <p className="mt-2 text-lg">Create a company profile, post your openings and start receiving applications.</p>
            <Link to="/register" className="mt-4 inline-block px-6 py-3 bg-white text-purple-500 font-bold rounded-md">
              Sign Up For Free
            </Link>
          </div>
          <img src={dashboard} alt="Dashboard" className="h-48 w-auto" />
        </div>
      </div>
    </div>
  );
};

export default Explore;
