import { Link } from 'react-router-dom';
import { FaMapMarkerAlt, FaRegClock, FaCalendarAlt } from 'react-icons/fa';
import CompanyAvatar from '../../../components/CompanyAvatar';
import { useAuth } from '../../../context/AuthContext';
import { formatDate, formatSalary, isExpired, isOpen, timeAgo, toLines } from '../../../utils/format';

const Section = ({ title, children }) => (
  <section className="mt-6">
    <h2 className="text-lg font-bold mb-2">{title}</h2>
    {children}
  </section>
);

const BulletList = ({ text }) => {
  const lines = toLines(text);
  if (!lines.length) return null;
  return <ul className="list-disc pl-5 space-y-1 text-gray-700">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>;
};

const SingleJobViewer = ({ job, applied = false }) => {
  const { user } = useAuth();
  const id = job._id || job.id;
  const open = isOpen(job);
  const salary = formatSalary(job);

  return (
    <article className="bg-white p-5 sm:p-8 rounded-lg shadow">
      <Link to="/jobs" className="text-sm text-primary hover:underline">&larr; Back to all jobs</Link>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <CompanyAvatar name={job.company} size="h-16 w-16" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{job.title}</h1>
            {job.employer ? (
              <Link to={`/employer/${job.employer}`} className="text-gray-600 hover:text-primary hover:underline">{job.company}</Link>
            ) : (
              <p className="text-gray-600">{job.company}</p>
            )}
          </div>
        </div>
        {!open ? (
          <span className="bg-gray-200 text-gray-600 py-3 px-6 rounded-md text-center">Applications closed</span>
        ) : user?.role === 'company' ? null : applied ? (
          <Link to="/clientdashboard" className="bg-green-100 text-green-800 py-3 px-6 rounded-md text-center">Applied &#10003; View status</Link>
        ) : (
          <Link to={`/apply/${id}`} className="bg-primary text-white py-3 px-6 rounded-md text-center hover:opacity-90">Apply now</Link>
        )}
      </div>

      {!open && (
        <p role="status" className="mt-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded">
          {isExpired(job) ? 'The application deadline for this job has passed.' : 'This job is no longer accepting applications.'}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
        <span className="flex items-center"><FaMapMarkerAlt className="mr-1.5" />{job.location}</span>
        <span className="flex items-center"><FaRegClock className="mr-1.5" />{job.type}{job.workMode ? ` · ${job.workMode}` : ''}</span>
        {job.deadline && <span className="flex items-center"><FaCalendarAlt className="mr-1.5" />Apply by {formatDate(job.deadline)}</span>}
        {salary && <span className="font-medium text-gray-800">{salary}</span>}
        <span className="text-gray-400">Posted {timeAgo(job.createdAt).toLowerCase()}</span>
      </div>

      {job.categories?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {job.categories.map((c) => <span key={c} className="bg-purple-50 text-primary text-xs font-semibold px-2.5 py-0.5 rounded">{c}</span>)}
        </div>
      )}

      <Section title="Job description"><p className="text-gray-700 whitespace-pre-line">{job.description}</p></Section>
      {toLines(job.responsibilities).length > 0 && <Section title="Responsibilities"><BulletList text={job.responsibilities} /></Section>}
      {toLines(job.qualifications).length > 0 && <Section title="Qualifications"><BulletList text={job.qualifications} /></Section>}
    </article>
  );
};

export default SingleJobViewer;
