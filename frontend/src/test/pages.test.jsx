import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../services/api', async () => ({
  ...(await vi.importActual('../services/api')),
  getJobs: vi.fn(),
  getJob: vi.fn(),
  getJobMeta: vi.fn(),
  getMyApplications: vi.fn(),
  getMe: vi.fn(),
}));

import { getJobs, getJob, getJobMeta } from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import JobSearchPage from '../modules/Build/Searchengine/JobSearchPage';
import JobPage from '../modules/Build/Searchengine/JobPage';
import Presentation from '../modules/Landing/components/Presentation';
import FeaturedJobs from '../modules/Landing/components/FeaturedJobs';

const job = (n, extra = {}) => ({
  _id: `id${n}`, title: `Job ${n}`, company: 'Acme Ltd', location: 'Nairobi, Kenya', type: 'Full-Time',
  workMode: 'Hybrid', categories: ['React'], salaryMin: 100000, salaryMax: 150000, salaryCurrency: 'KES',
  status: 'open', createdAt: new Date().toISOString(), description: 'Great role', responsibilities: 'Do A\nDo B', qualifications: 'Know X', ...extra,
});

const LocationProbe = () => <div data-testid="loc">{useLocation().pathname + useLocation().search}</div>;

const renderAt = (path, ui, route = '*') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes><Route path={route} element={ui} /></Routes>
        <LocationProbe />
      </AuthProvider>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  getJobMeta.mockResolvedValue({ types: ['Full-Time'], workModes: ['Remote'], industries: ['Technology'], locations: [] });
});

describe('JobSearchPage', () => {
  test('shows results and count from the API', async () => {
    getJobs.mockResolvedValue({ jobs: [job(1), job(2)], total: 2, page: 1, pages: 1 });
    renderAt('/jobs', <JobSearchPage />);
    expect(await screen.findByText('Job 1')).toBeTruthy();
    expect(screen.getByText('2 jobs found')).toBeTruthy();
    expect(screen.getByText('Job 2').closest('a').getAttribute('href')).toBe('/job/id2');
  });

  test('reads filters from the URL and sends them to the API', async () => {
    getJobs.mockResolvedValue({ jobs: [job(1)], total: 1, page: 1, pages: 1 });
    renderAt('/jobs?q=design&location=Nairobi&type=Contract', <JobSearchPage />);
    await screen.findByText('Job 1');
    expect(getJobs).toHaveBeenCalledWith(expect.objectContaining({ q: 'design', location: 'Nairobi', type: 'Contract' }));
    expect(screen.getByPlaceholderText('Job title, keyword or company').value).toBe('design');
  });

  test('submitting the search bar updates the URL and refetches', async () => {
    getJobs.mockResolvedValue({ jobs: [job(1)], total: 1, page: 1, pages: 1 });
    const user = userEvent.setup();
    renderAt('/jobs', <JobSearchPage />);
    await screen.findByText('Job 1');
    await user.type(screen.getByPlaceholderText('Job title, keyword or company'), 'react');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/jobs?q=react'));
    await waitFor(() => expect(getJobs).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'react' })));
  });

  test('changing a filter updates the URL and resets to page 1', async () => {
    getJobs.mockResolvedValue({ jobs: [job(1)], total: 30, page: 2, pages: 3 });
    const user = userEvent.setup();
    renderAt('/jobs?page=2', <JobSearchPage />);
    await screen.findByText('Job 1');
    await user.selectOptions(screen.getByLabelText('Job type'), 'Full-Time');
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/jobs?type=Full-Time'));
  });

  test('pagination moves to the next page', async () => {
    getJobs.mockResolvedValue({ jobs: [job(1)], total: 30, page: 1, pages: 3 });
    const user = userEvent.setup();
    renderAt('/jobs', <JobSearchPage />);
    await screen.findByText('Job 1');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/jobs?page=2'));
  });

  test('empty state offers to clear filters', async () => {
    getJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, pages: 1 });
    const user = userEvent.setup();
    renderAt('/jobs?q=zzz', <JobSearchPage />);
    expect(await screen.findByText('No jobs found')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/jobs'));
  });

  test('shows an error with retry', async () => {
    getJobs.mockRejectedValueOnce({ request: {}, message: 'Network Error' });
    getJobs.mockResolvedValue({ jobs: [job(1)], total: 1, page: 1, pages: 1 });
    const user = userEvent.setup();
    renderAt('/jobs', <JobSearchPage />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Job 1')).toBeTruthy();
  });
});

describe('JobPage', () => {
  test('renders the full job', async () => {
    getJob.mockResolvedValue(job(7));
    renderAt('/job/id7', <JobPage />, '/job/:id');
    expect(await screen.findByRole('heading', { name: 'Job 7' })).toBeTruthy();
    expect(screen.getByText('Do B')).toBeTruthy();
    expect(screen.getByText('KES 100,000 – 150,000')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Apply now' }).getAttribute('href')).toBe('/apply/id7');
    expect(getJob).toHaveBeenCalledWith('id7');
  });

  test('closed or expired jobs cannot be applied to', async () => {
    getJob.mockResolvedValue(job(8, { deadline: new Date(Date.now() - 86400000).toISOString() }));
    renderAt('/job/id8', <JobPage />, '/job/:id');
    expect(await screen.findByText('Applications closed')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Apply now' })).toBeNull();
  });

  test('missing job shows a friendly message', async () => {
    getJob.mockRejectedValue({ response: { data: { message: 'Job not found' } } });
    renderAt('/job/nope', <JobPage />, '/job/:id');
    expect(await screen.findByText("This job doesn't exist or was removed.")).toBeTruthy();
  });
});

describe('Landing', () => {
  test('hero search navigates to /jobs with keyword and location', async () => {
    const user = userEvent.setup();
    renderAt('/', <Presentation />);
    await user.type(screen.getByPlaceholderText('Job title or keyword'), 'designer');
    await user.type(screen.getByPlaceholderText('City or country'), 'Nairobi');
    await user.click(screen.getByRole('button', { name: 'Search jobs' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/jobs?q=designer&location=Nairobi'));
  });

  test('featured jobs come from the API and link to the job page', async () => {
    getJobs.mockResolvedValue({ jobs: [job(3)], total: 1, page: 1, pages: 1 });
    renderAt('/', <FeaturedJobs />);
    const link = (await screen.findByText('Job 3')).closest('a');
    expect(link.getAttribute('href')).toBe('/job/id3');
    expect(getJobs).toHaveBeenCalledWith({ featured: 'true', limit: 4 });
  });

  test('featured section hides itself when there are none', async () => {
    getJobs.mockResolvedValue({ jobs: [], total: 0, page: 1, pages: 1 });
    const { container } = renderAt('/', <FeaturedJobs />);
    await waitFor(() => expect(container.querySelector('section')).toBeNull());
  });
});
