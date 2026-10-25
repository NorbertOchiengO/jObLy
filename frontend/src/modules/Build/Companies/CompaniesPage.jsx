import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaMapMarkerAlt } from 'react-icons/fa';
import Layout from '../../../components/Layout';
import CompanyAvatar from '../../../components/CompanyAvatar';
import Pagination from '../Searchengine/Pagination';
import { JobSkeletons } from '../Searchengine/JobList';
import { getCompanies, logoUrl } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';

const INPUT = 'w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:border-primary';

const CompaniesPage = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const location = params.get('location') || '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

  const [name, setName] = useState(q);
  const [place, setPlace] = useState(location);
  useEffect(() => { setName(params.get('q') || ''); setPlace(params.get('location') || ''); }, [params]);

  const { data, loading, error, reload } = useAsync(() => getCompanies({ q, location, page, limit: 12 }), params.toString());

  const update = (changes, keepPage = false) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete('page');
    setParams(next);
  };
  const hasFilters = !!(q || location);

  return (
    <Layout>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Companies hiring now</h1>
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); update({ q: name.trim(), location: place.trim() }); }}
        className="p-3 bg-white shadow-md rounded-lg mb-6 flex flex-col sm:flex-row gap-3"
      >
        <label className="flex-1"><span className="sr-only">Company name</span>
          <input className={INPUT} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex-1"><span className="sr-only">Location</span>
          <input className={INPUT} placeholder="City or country" value={place} onChange={(e) => setPlace(e.target.value)} />
        </label>
        <button type="submit" className="bg-primary text-white py-2 px-6 rounded-md hover:opacity-90">Search</button>
      </form>

      {error ? (
        <div role="alert" className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
          <p className="text-red-700">{error}</p>
          <button onClick={reload} className="mt-3 bg-primary text-white py-2 px-4 rounded">Try again</button>
        </div>
      ) : loading && !data ? (
        <JobSkeletons count={6} />
      ) : data.companies.length === 0 ? (
        <div className="p-8 border border-dashed rounded-lg text-center bg-white">
          <p className="text-lg font-semibold">No companies found</p>
          <p className="text-gray-500 mt-1">{hasFilters ? 'Try a different name or location.' : 'No companies are hiring right now. Check back soon.'}</p>
          {hasFilters && <button onClick={() => setParams(new URLSearchParams())} className="mt-4 bg-primary text-white py-2 px-4 rounded">Clear filters</button>}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-600" aria-live="polite">{data.total} {data.total === 1 ? 'company' : 'companies'}</p>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${loading ? 'opacity-60' : ''}`}>
            {data.companies.map((c) => (
              <Link key={c._id} to={`/employer/${c._id}`} className="block border bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:border-primary transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={c.companyName} logo={c.hasLogo ? logoUrl(c._id, c.logoVersion) : null} />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">{c.companyName}</h2>
                    {c.industry && <p className="text-gray-600 text-sm truncate">{c.industry}</p>}
                  </div>
                </div>
                {c.tagline && <p className="mt-3 text-sm text-gray-600 line-clamp-2">{c.tagline}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="flex items-center text-gray-500 min-w-0"><FaMapMarkerAlt className="mr-1.5 shrink-0" /><span className="truncate">{c.city || c.location || 'Location not listed'}</span></span>
                  <span className="bg-purple-50 text-primary font-semibold px-2.5 py-0.5 rounded whitespace-nowrap">{c.openJobs} open {c.openJobs === 1 ? 'job' : 'jobs'}</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={(p) => { update({ page: p > 1 ? String(p) : '' }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}
    </Layout>
  );
};

export default CompaniesPage;
