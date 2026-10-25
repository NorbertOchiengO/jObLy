import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../services/api', async () => ({
  ...(await vi.importActual('../services/api')),
  getMe: vi.fn(), getJob: vi.fn(), getMyApplications: vi.fn(), getMyJobs: vi.fn(),
  getReceivedApplications: vi.fn(), updateApplicationStatus: vi.fn(), downloadResume: vi.fn(),
  createJob: vi.fn(), updateJob: vi.fn(), deleteJob: vi.fn(),
}));

import * as api from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import EmployerDashboard from '../modules/Build/dashboard/employerdashboard/EmployerDashboard';
import Overview from '../modules/Build/dashboard/employerdashboard/Overview';
import JobListings from '../modules/Build/dashboard/employerdashboard/JobListings';
import JobForm from '../modules/Build/dashboard/employerdashboard/JobForm';
import Applicants from '../modules/Build/dashboard/employerdashboard/Applicants';
import EmployeeDashboard from '../modules/Build/dashboard/EmployeeDashboard/EmployeeDashboard';
import MyApplications from '../modules/Build/dashboard/EmployeeDashboard/MyApplications';

const SEEKER = { _id: 's', name: 'Jane Doe', email: 'j@x.co', role: 'individual' };
const BOSS = { _id: 'b', name: 'Boss Man', email: 'b@x.co', role: 'company', companyName: 'Acme' };
const Probe = () => { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.search}</div>; };

const open = (path, user) => {
  localStorage.setItem('token', 't');
  api.getMe.mockResolvedValue({ data: user });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute role="company"><EmployerDashboard /></ProtectedRoute>}>
            <Route index element={<Overview />} />
            <Route path="jobs" element={<JobListings />} />
            <Route path="jobs/new" element={<JobForm />} />
            <Route path="jobs/:id/edit" element={<JobForm />} />
            <Route path="applicants" element={<Applicants />} />
          </Route>
          <Route path="/clientdashboard" element={<ProtectedRoute role="individual"><EmployeeDashboard /></ProtectedRoute>}>
            <Route index element={<MyApplications />} />
          </Route>
          <Route path="/" element={<p>home</p>} />
        </Routes>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
};

const JOB = (n, extra = {}) => ({ _id: `j${n}`, employer: 'b', title: `Job ${n}`, company: 'Acme', location: 'Nairobi', status: 'open', createdAt: '2026-10-01T00:00:00Z', applicationCount: 2, description: 'D', ...extra });
const APP = (n, status = 'submitted', extra = {}) => ({ _id: `a${n}`, fullName: `Person ${n}`, email: `p${n}@x.co`, phone: '0700', status, createdAt: '2026-10-05T00:00:00Z', job: { _id: 'j1', title: 'Job 1' }, resume: { originalName: `cv${n}.pdf` }, ...extra });

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

describe('layout', () => {
  test('greets the real user and logs out', async () => {
    api.getMyApplications.mockResolvedValue({ applications: [] });
    const user = userEvent.setup();
    open('/clientdashboard', SEEKER);
    expect(await screen.findByRole('heading', { name: /Jane/ })).toBeTruthy();
    expect(screen.queryByText('Maria')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('home')).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
  });

  test('mobile menu button toggles the sidebar', async () => {
    api.getMyJobs.mockResolvedValue({ jobs: [] });
    api.getReceivedApplications.mockResolvedValue({ applications: [] });
    const user = userEvent.setup();
    open('/dashboard', BOSS);
    const btn = await screen.findByRole('button', { name: 'Open menu' });
    await user.click(btn);
    expect(screen.getByRole('button', { name: 'Close menu' }).getAttribute('aria-expanded')).toBe('true');
  });
});

describe('job seeker: my applications', () => {
  test('shows real counts, statuses and links', async () => {
    api.getMyApplications.mockResolvedValue({ applications: [
      { _id: '1', status: 'shortlisted', createdAt: '2026-10-02T00:00:00Z', job: { _id: 'j1', title: 'Designer', company: 'Pixel' } },
      { _id: '2', status: 'rejected', createdAt: '2026-10-03T00:00:00Z', job: { _id: 'j2', title: 'Dev', company: 'Acme' } },
      { _id: '3', status: 'submitted', createdAt: '2026-10-04T00:00:00Z', job: null },
    ] });
    open('/clientdashboard', SEEKER);
    expect((await screen.findByText('Designer')).closest('a').getAttribute('href')).toBe('/job/j1');
    expect(screen.getByText('Job no longer available')).toBeTruthy();
    expect(screen.getByText('Applications').previousSibling.textContent).toBe('3');
    expect(screen.getByText('Shortlisted', { selector: 'span' })).toBeTruthy();
  });

  test('empty state points to job search', async () => {
    api.getMyApplications.mockResolvedValue({ applications: [] });
    open('/clientdashboard', SEEKER);
    expect(await screen.findByText("You haven't applied for any jobs yet")).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse jobs' }).getAttribute('href')).toBe('/jobs');
  });

  test('load failure shows retry', async () => {
    api.getMyApplications.mockRejectedValueOnce({ request: {} }).mockResolvedValue({ applications: [] });
    const user = userEvent.setup();
    open('/clientdashboard', SEEKER);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText("You haven't applied for any jobs yet")).toBeTruthy();
  });
});

describe('employer: overview', () => {
  test('computes stats from real data', async () => {
    api.getMyJobs.mockResolvedValue({ jobs: [JOB(1), JOB(2, { status: 'closed' })] });
    api.getReceivedApplications.mockResolvedValue({ applications: [APP(1), APP(2, 'shortlisted'), APP(3, 'submitted')] });
    open('/dashboard', BOSS);
    const stat = async (label) => (await screen.findByText(label, { selector: 'p' })).previousSibling.textContent;
    expect(await stat('Open jobs')).toBe('1');
    expect(await stat('Total applicants')).toBe('3');
    expect(await stat('New to review')).toBe('2');
    expect(await stat('Shortlisted')).toBe('1');
    expect(screen.getByText('Person 1')).toBeTruthy();
  });

  test('first-time employers are invited to post a job', async () => {
    api.getMyJobs.mockResolvedValue({ jobs: [] });
    api.getReceivedApplications.mockResolvedValue({ applications: [] });
    open('/dashboard', BOSS);
    expect(await screen.findByText("You haven't posted any jobs yet")).toBeTruthy();
  });
});

describe('employer: job listings', () => {
  beforeEach(() => { api.getMyJobs.mockResolvedValue({ jobs: [JOB(1), JOB(2, { status: 'closed', applicationCount: 0 })] }); });

  test('lists jobs with applicant counts linking to filtered applicants', async () => {
    open('/dashboard/jobs', BOSS);
    const row = (await screen.findByText('Job 1')).closest('tr');
    expect(within(row).getByRole('link', { name: '2' }).getAttribute('href')).toBe('/dashboard/applicants?jobId=j1');
  });

  test('close and reopen send the right status', async () => {
    api.updateJob.mockResolvedValue({});
    const user = userEvent.setup();
    open('/dashboard/jobs', BOSS);
    const r1 = (await screen.findByText('Job 1')).closest('tr');
    await user.click(within(r1).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(api.updateJob).toHaveBeenCalledWith('j1', { status: 'closed' }));
    const r2 = screen.getByText('Job 2').closest('tr');
    await user.click(within(r2).getByRole('button', { name: 'Reopen' }));
    await waitFor(() => expect(api.updateJob).toHaveBeenCalledWith('j2', { status: 'open' }));
  });

  test('delete needs confirmation', async () => {
    api.deleteJob.mockResolvedValue({});
    const user = userEvent.setup();
    open('/dashboard/jobs', BOSS);
    const row = (await screen.findByText('Job 1')).closest('tr');
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(api.deleteJob).not.toHaveBeenCalled();
    await user.click(within(row).getByRole('button', { name: 'Cancel' }));
    await user.click(within(row).getByRole('button', { name: 'Delete' }));
    await user.click(within(row).getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(api.deleteJob).toHaveBeenCalledWith('j1'));
  });

  test('shows the server error when an action fails', async () => {
    api.updateJob.mockRejectedValue({ response: { data: { message: 'You can only change your own jobs' } } });
    const user = userEvent.setup();
    open('/dashboard/jobs', BOSS);
    await user.click(within((await screen.findByText('Job 1')).closest('tr')).getByRole('button', { name: 'Close' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/only change your own/);
  });
});

describe('employer: job form', () => {
  test('creates a job (company prefilled, status not sent) and returns to the list', async () => {
    api.createJob.mockResolvedValue({});
    api.getMyJobs.mockResolvedValue({ jobs: [] });
    const user = userEvent.setup();
    open('/dashboard/jobs/new', BOSS);
    expect((await screen.findByLabelText('Company')).value).toBe('Acme');
    await user.type(screen.getByLabelText('Job title'), 'Cook');
    await user.type(screen.getByLabelText('Location'), 'Nairobi');
    await user.type(screen.getByLabelText('Job description'), 'Cook food');
    await user.click(screen.getByRole('button', { name: 'Post job' }));
    await waitFor(() => expect(api.createJob).toHaveBeenCalled());
    const payload = api.createJob.mock.calls[0][0];
    expect(payload).toMatchObject({ title: 'Cook', company: 'Acme', location: 'Nairobi', type: 'Full-Time' });
    expect(payload.status).toBeUndefined();
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/dashboard/jobs'));
  });

  test('validates required fields and salary range before calling the API', async () => {
    const user = userEvent.setup();
    open('/dashboard/jobs/new', BOSS);
    await user.click(await screen.findByRole('button', { name: 'Post job' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/required/);
    await user.type(screen.getByLabelText('Job title'), 'T');
    await user.type(screen.getByLabelText('Location'), 'L');
    await user.type(screen.getByLabelText('Job description'), 'D');
    await user.type(screen.getByLabelText('Minimum salary (KES)'), '200');
    await user.type(screen.getByLabelText('Maximum salary (KES)'), '100');
    await user.click(screen.getByRole('button', { name: 'Post job' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Minimum salary/);
    expect(api.createJob).not.toHaveBeenCalled();
  });

  test('edits an existing job', async () => {
    api.getJob.mockResolvedValue(JOB(1, { categories: ['React', 'Node'], deadline: '2026-12-31T00:00:00Z' }));
    api.updateJob.mockResolvedValue({});
    api.getMyJobs.mockResolvedValue({ jobs: [] });
    const user = userEvent.setup();
    open('/dashboard/jobs/j1/edit', BOSS);
    expect((await screen.findByLabelText('Job title')).value).toBe('Job 1');
    expect(screen.getByLabelText('Skills / tags').value).toBe('React, Node');
    expect(screen.getByLabelText('Application deadline').value).toBe('2026-12-31');
    await user.clear(screen.getByLabelText('Job title'));
    await user.type(screen.getByLabelText('Job title'), 'Senior Job');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateJob).toHaveBeenCalledWith('j1', expect.objectContaining({ title: 'Senior Job', status: 'open' })));
  });

  test('refuses to edit someone else\'s job', async () => {
    api.getJob.mockResolvedValue(JOB(1, { employer: 'someone-else' }));
    open('/dashboard/jobs/j1/edit', BOSS);
    expect(await screen.findByText('You can only edit your own jobs.')).toBeTruthy();
  });

  test('shows the server error on save', async () => {
    api.createJob.mockRejectedValue({ response: { data: { message: 'Something invalid' } } });
    const user = userEvent.setup();
    open('/dashboard/jobs/new', BOSS);
    await user.type(await screen.findByLabelText('Job title'), 'T');
    await user.type(screen.getByLabelText('Location'), 'L');
    await user.type(screen.getByLabelText('Job description'), 'D');
    await user.click(screen.getByRole('button', { name: 'Post job' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Something invalid');
    expect(screen.getByRole('button', { name: 'Post job' }).disabled).toBe(false);
  });
});

describe('employer: applicants', () => {
  beforeEach(() => {
    api.getMyJobs.mockResolvedValue({ jobs: [JOB(1)] });
    api.getReceivedApplications.mockResolvedValue({ applications: [APP(1, 'submitted', { coverLetter: 'Hire me' }), APP(2, 'rejected')] });
  });

  test('passes URL filters to the API', async () => {
    open('/dashboard/applicants?jobId=j1&status=submitted', BOSS);
    await screen.findByText('Person 1');
    expect(api.getReceivedApplications).toHaveBeenCalledWith({ jobId: 'j1', status: 'submitted' });
  });

  test('changing a filter updates the URL', async () => {
    const user = userEvent.setup();
    open('/dashboard/applicants', BOSS);
    await screen.findByText('Person 1');
    await user.selectOptions(screen.getByLabelText('Status'), 'shortlisted');
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/dashboard/applicants?status=shortlisted'));
  });

  test('updates an applicant status', async () => {
    api.updateApplicationStatus.mockResolvedValue({});
    const user = userEvent.setup();
    open('/dashboard/applicants', BOSS);
    await user.selectOptions(await screen.findByLabelText('Status for Person 1'), 'shortlisted');
    await waitFor(() => expect(api.updateApplicationStatus).toHaveBeenCalledWith('a1', 'shortlisted'));
  });

  test('downloads a resume with its original name, and reports failures', async () => {
    api.downloadResume.mockResolvedValueOnce().mockRejectedValueOnce(new Error('x'));
    const user = userEvent.setup();
    open('/dashboard/applicants', BOSS);
    const buttons = await screen.findAllByRole('button', { name: 'Download resume' });
    await user.click(buttons[0]);
    expect(api.downloadResume).toHaveBeenCalledWith('a1', 'cv1.pdf');
    await user.click(buttons[1]);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Could not download/);
  });

  test('shows each applicant\'s headline and skills from their profile', async () => {
    api.getReceivedApplications.mockResolvedValue({ applications: [APP(1, 'submitted', { applicant: { profile: { headline: 'Frontend Developer', skills: ['React', 'Figma'] } } })] });
    open('/dashboard/applicants', BOSS);
    expect(await screen.findByText('Frontend Developer')).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('Figma')).toBeTruthy();
  });

  test('shows the cover letter and an empty state', async () => {
    open('/dashboard/applicants', BOSS);
    expect(await screen.findByText('Hire me')).toBeTruthy();
  });

  test('empty state when nobody applied', async () => {
    api.getReceivedApplications.mockResolvedValue({ applications: [] });
    open('/dashboard/applicants', BOSS);
    expect(await screen.findByText('No applicants found')).toBeTruthy();
  });
});
