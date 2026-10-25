import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaRegClock } from 'react-icons/fa';
import CompanyAvatar from '../../../components/CompanyAvatar';
import { formatSalary, timeAgo } from '../../../utils/format';

const JobItem = ({ job }) => {
  const id = job._id || job.id;
  const salary = formatSalary(job);

  return (
    <Link
      to={`/job/${id}`}
      className="block border bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:border-primary transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar name={job.company} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">{job.title}</h3>
          <p className="text-gray-600 truncate">{job.company}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-sm text-gray-500">
        <div className="flex items-center"><FaMapMarkerAlt className="mr-1.5 shrink-0" />{job.location}</div>
        <div className="flex items-center"><FaRegClock className="mr-1.5 shrink-0" />{job.type}{job.workMode ? ` · ${job.workMode}` : ''}</div>
        {salary && <div className="text-gray-700 font-medium">{salary}</div>}
      </div>

      {job.categories?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {job.categories.slice(0, 3).map((c) => (
            <span key={c} className="bg-purple-50 text-primary text-xs font-semibold px-2.5 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">{timeAgo(job.createdAt)}</p>
    </Link>
  );
};

export default JobItem;
