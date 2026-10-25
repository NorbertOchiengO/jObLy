import { Link, useParams } from 'react-router-dom';
import { FaMapMarkerAlt, FaIndustry, FaGlobe, FaUsers, FaCalendarAlt } from 'react-icons/fa';
import Layout from '../../../components/Layout';
import CompanyAvatar from '../../../components/CompanyAvatar';
import JobItem from '../Searchengine/JobItem';
import { getCompany, logoUrl } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';

const CompanyPage = () => {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => getCompany(id), id);

  let body;
  if (loading) {
    body = <div role="status" className="p-8 text-center text-gray-500">Loading...</div>;
  } else if (error) {
    const notFound = /not found|invalid company id/i.test(error);
    body = (
      <div role="alert" className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-lg font-semibold">{notFound ? "This company doesn't exist." : "We couldn't load this company."}</p>
        <div className="mt-4 flex justify-center gap-3">
          {!notFound && <button onClick={reload} className="bg-primary text-white py-2 px-4 rounded">Try again</button>}
          <Link to="/employers" className="border border-primary text-primary py-2 px-4 rounded">All companies</Link>
        </div>
      </div>
    );
  } else {
    const { company, jobs } = data;
    body = (
      <div className="space-y-6">
        <Link to="/employers" className="text-sm text-primary hover:underline">&larr; All companies</Link>
        <div className="bg-white p-5 sm:p-8 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <CompanyAvatar name={company.companyName} size="h-20 w-20" logo={company.hasLogo ? logoUrl(company._id, company.logoVersion) : null} />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold">{company.companyName}</h1>
              {company.tagline && <p className="text-gray-600 mt-1">{company.tagline}</p>}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            {company.industry && <span className="flex items-center"><FaIndustry className="mr-1.5" />{company.industry}</span>}
            {(company.city || company.location) && <span className="flex items-center"><FaMapMarkerAlt className="mr-1.5" />{company.city || company.location}</span>}
            {company.companySize && <span className="flex items-center"><FaUsers className="mr-1.5" />{company.companySize} employees</span>}
            {company.foundedYear && <span className="flex items-center"><FaCalendarAlt className="mr-1.5" />Founded {company.foundedYear}</span>}
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center text-primary hover:underline">
                <FaGlobe className="mr-1.5" />Website
              </a>
            )}
          </div>

          {company.description && (
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2">About {company.companyName}</h2>
              <p className="text-gray-700 whitespace-pre-line">{company.description}</p>
            </div>
          )}
        </div>

        <section>
          <h2 className="text-xl font-bold mb-3">Latest jobs ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="p-6 bg-white border border-dashed rounded-lg text-center text-gray-500">No open positions right now.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((j) => <JobItem key={j._id} job={j} />)}
            </div>
          )}
        </section>
      </div>
    );
  }

  return <Layout>{body}</Layout>;
};

export default CompanyPage;
