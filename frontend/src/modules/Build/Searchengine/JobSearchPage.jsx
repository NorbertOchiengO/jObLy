import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import SearchBar from './SearchBar';
import Filters from './Filters';
import JobList from './JobList';
import Pagination from './Pagination';
import { getJobs, getJobMeta } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['q', 'location', 'type', 'workMode', 'industry'];
const DEFAULT_META = { types: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'], workModes: ['On-site', 'Remote', 'Hybrid'], industries: [], locations: [] };

// The URL is the single source of truth, so searches are shareable and the hero search can link here
const JobSearchPage = () => {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);

  const [keyword, setKeyword] = useState(get('q'));
  const [location, setLocation] = useState(get('location'));

  // keep the inputs in sync when the URL changes (back button, "clear filters", hero search)
  useEffect(() => { setKeyword(params.get('q') || ''); setLocation(params.get('location') || ''); }, [params]);

  const update = (changes, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete('page');
    setParams(next);
  };

  const query = {
    q: get('q'), location: get('location'), type: get('type'), workMode: get('workMode'),
    industry: get('industry'), sort: get('sort'), page, limit: PAGE_SIZE
  };

  const jobsState = useAsync(() => getJobs(query), params.toString());
  const metaState = useAsync(getJobMeta, 'meta');
  const meta = { ...DEFAULT_META, ...(metaState.data || {}) };

  const hasFilters = FILTER_KEYS.some((k) => get(k));
  const data = jobsState.data;

  const onSubmit = (e) => { e.preventDefault(); update({ q: keyword.trim(), location: location.trim() }); };
  const clearAll = () => setParams(new URLSearchParams());
  const goToPage = (p) => { update({ page: p > 1 ? String(p) : '' }, { keepPage: true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <Layout>
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Find your next job</h1>
      <SearchBar keyword={keyword} setKeyword={setKeyword} location={location} setLocation={setLocation} onSubmit={onSubmit} />
      <Filters
        values={{ type: get('type'), workMode: get('workMode'), industry: get('industry'), sort: get('sort') }}
        meta={meta}
        onChange={update}
        onClear={clearAll}
        hasFilters={hasFilters || !!get('sort')}
      />

      {data && !jobsState.error && (
        <p className="mb-3 text-sm text-gray-600" aria-live="polite">
          {data.total} {data.total === 1 ? 'job' : 'jobs'} found
        </p>
      )}

      <JobList
        jobs={data?.jobs}
        loading={jobsState.loading}
        error={jobsState.error}
        onRetry={jobsState.reload}
        onClear={clearAll}
        hasFilters={hasFilters}
      />
      {data && !jobsState.error && <Pagination page={data.page} pages={data.pages} onChange={goToPage} />}
    </Layout>
  );
};

export default JobSearchPage;
