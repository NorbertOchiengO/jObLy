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
  login: vi.fn(),
  register: vi.fn(),
  applyToJob: vi.fn(),
  getProfile: vi.fn(),
}));

import { getJob, getMe, getMyApplications, login, register, applyToJob, getProfile } from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../modules/Build/user/Login';
import Register from '../modules/Build/user/Register';
import NavBar from '../modules/Landing/components/Navbar';
import ApplyPage from '../modules/Build/Searchengine/ApplyPage';
import JobPage from '../modules/Build/Searchengine/JobPage';

const SEEKER = { _id: 's1', name: 'Jane Doe', email: 'jane@example.com', role: 'individual' };
const BOSS = { _id: 'b1', name: 'Boss Man', email: 'boss@example.com', role: 'company' };
const JOB = { _id: 'j1', title: 'Dev', company: 'Acme', location: 'Nairobi', type: 'Full-Time', status: 'open', description: 'x', createdAt: new Date().toISOString() };

const Probe = () => { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.search}</div>; };

const renderApp = (path, routes) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>{routes}</Routes>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );

const loggedInAs = (user) => { localStorage.setItem('token', 't'); getMe.mockResolvedValue({ data: user }); };

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

describe('session + protected routes', () => {
  const routes = [
    <Route key="d" path="/dashboard" element={<ProtectedRoute role="company"><p>boss area</p></ProtectedRoute>} />,
    <Route key="c" path="/clientdashboard" element={<ProtectedRoute role="individual"><p>seeker area</p></ProtectedRoute>} />,
    <Route key="l" path="/login" element={<p>login page</p>} />,
  ];

  test('logged-out visitors are sent to /login', async () => {
    renderApp('/dashboard', routes);
    expect(await screen.findByText('login page')).toBeTruthy();
  });

  test('a saved token restores the session on refresh', async () => {
    loggedInAs(BOSS);
    renderApp('/dashboard', routes);
    expect(await screen.findByText('boss area')).toBeTruthy();
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  test('wrong role is redirected to their own dashboard', async () => {
    loggedInAs(SEEKER);
    renderApp('/dashboard', routes);
    expect(await screen.findByText('seeker area')).toBeTruthy();
  });

  test('a rejected token is forgotten', async () => {
    localStorage.setItem('token', 'bad');
    getMe.mockRejectedValue({ response: { status: 401 } });
    renderApp('/dashboard', routes);
    expect(await screen.findByText('login page')).toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('Login', () => {
  const routes = [
    <Route key="l" path="/login" element={<Login />} />,
    <Route key="c" path="/clientdashboard" element={<p>seeker area</p>} />,
    <Route key="a" path="/apply/j1" element={<p>apply page</p>} />,
  ];

  test('logs in and goes to the role dashboard', async () => {
    login.mockResolvedValue({ data: { token: 'abc', role: 'individual' } });
    getMe.mockResolvedValue({ data: SEEKER });
    const user = userEvent.setup();
    renderApp('/login', routes);
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('seeker area')).toBeTruthy();
    expect(localStorage.getItem('token')).toBe('abc');
  });

  test('returns to the page they were trying to reach', async () => {
    login.mockResolvedValue({ data: { token: 'abc', role: 'individual' } });
    getMe.mockResolvedValue({ data: SEEKER });
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/apply/j1' } }]}>
        <AuthProvider><Routes>{routes}</Routes></AuthProvider>
      </MemoryRouter>
    );
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('apply page')).toBeTruthy();
  });

  test('shows the server error and re-enables the button', async () => {
    login.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } });
    const user = userEvent.setup();
    renderApp('/login', routes);
    await user.type(screen.getByLabelText('Email'), 'a@b.co');
    await user.type(screen.getByLabelText('Password'), 'wrongpw');
    await user.click(screen.getByRole('button', { name: 'Login' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid credentials');
    expect(screen.getByRole('button', { name: 'Login' }).disabled).toBe(false);
  });

  test('password can be shown and hidden', async () => {
    const user = userEvent.setup();
    renderApp('/login', routes);
    const input = screen.getByLabelText('Password');
    expect(input.type).toBe('password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
  });
});

describe('Register', () => {
  const routes = [<Route key="r" path="/register" element={<Register />} />, <Route key="d" path="/dashboard" element={<p>boss area</p>} />];

  test('blocks a short password without calling the API', async () => {
    const user = userEvent.setup();
    renderApp('/register', routes);
    await user.type(screen.getByLabelText('Name'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), '123');
    // minLength is enforced by the browser; also check our own message by bypassing it
    screen.getByLabelText('Password').removeAttribute('minlength');
    await user.click(screen.getByRole('button', { name: 'Register' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 8/);
    expect(register).not.toHaveBeenCalled();
  });

  test('company registration sends company fields and lands on the dashboard', async () => {
    register.mockResolvedValue({ data: { token: 'tok', role: 'company' } });
    getMe.mockResolvedValue({ data: BOSS });
    const user = userEvent.setup();
    renderApp('/register', routes);
    await user.type(screen.getByLabelText('Name'), 'Boss Man');
    await user.type(screen.getByLabelText('Email'), 'boss@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.selectOptions(screen.getByLabelText('Register as'), 'company');
    for (const label of ['Company name', 'Your position', 'Type of company', 'Industry', 'Address', 'Location', 'City']) {
      await user.type(screen.getByLabelText(label), 'x');
    }
    await user.click(screen.getByRole('button', { name: 'Register' }));
    expect(await screen.findByText('boss area')).toBeTruthy();
    expect(register).toHaveBeenCalledWith(expect.objectContaining({ role: 'company', companyName: 'x' }));
  });
});

describe('NavBar', () => {
  test('logged-in users see Dashboard + Log out, and logging out clears the session', async () => {
    loggedInAs(SEEKER);
    const user = userEvent.setup();
    renderApp('/', [<Route key="n" path="*" element={<NavBar />} />]);
    expect((await screen.findAllByText('Dashboard'))[0].closest('a').getAttribute('href')).toBe('/clientdashboard');
    expect(screen.queryByText('Sign Up')).toBeNull();
    await user.click(screen.getAllByRole('button', { name: 'Log out' })[0]);
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
    expect((await screen.findAllByText('Sign Up')).length).toBeGreaterThan(0);
  });
});

describe('ApplyPage', () => {
  const routes = [<Route key="a" path="/apply/:id" element={<ProtectedRoute role="individual"><ApplyPage /></ProtectedRoute>} />];
  const cv = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });

  beforeEach(() => { loggedInAs(SEEKER); getJob.mockResolvedValue(JOB); getProfile.mockResolvedValue({ name: 'Jane Doe', email: 'jane@example.com', profile: { phone: '0700 000 001', cv: null } }); });

  test('prefills from the account and submits the form data', async () => {
    applyToJob.mockResolvedValue({ _id: 'a1' });
    const user = userEvent.setup();
    renderApp('/apply/j1', routes);
    expect((await screen.findByLabelText('Full name')).value).toBe('Jane Doe');
    expect(screen.getByLabelText('Email').value).toBe('jane@example.com');
    await user.upload(screen.getByLabelText('Resume file'), cv);
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Application submitted')).toBeTruthy();
    const [id, form] = applyToJob.mock.calls[0];
    expect(id).toBe('j1');
    expect(form.get('fullName')).toBe('Jane Doe');
    expect(form.get('resume').name).toBe('cv.pdf');
  });

  test('requires a resume and rejects the wrong file type', async () => {
    const user = userEvent.setup({ applyAccept: false }); // the browser's accept filter is bypassable, so we check again
    renderApp('/apply/j1', routes);
    await screen.findByLabelText('Full name');
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/attach your resume/);
    await user.upload(screen.getByLabelText('Resume file'), new File(['x'], 'pic.png', { type: 'image/png' }));
    expect(await screen.findByText(/PDF or Word document/)).toBeTruthy();
    expect(applyToJob).not.toHaveBeenCalled();
  });

  test('shows the server message for duplicate applications', async () => {
    applyToJob.mockRejectedValue({ response: { data: { message: 'You have already applied for this job' } } });
    const user = userEvent.setup();
    renderApp('/apply/j1', routes);
    await user.upload(await screen.findByLabelText('Resume file'), cv);
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/already applied/);
  });

  test('prefills the phone from the profile', async () => {
    renderApp('/apply/j1', routes);
    expect((await screen.findByLabelText('Phone (optional)')).value).toBe('0700 000 001');
  });

  test('applies with the saved CV, with no file upload needed', async () => {
    getProfile.mockResolvedValue({ name: 'Jane Doe', email: 'jane@example.com', profile: { phone: '', cv: { originalName: 'my-cv.pdf', size: 1000, uploadedAt: '2026-10-01T00:00:00Z' } } });
    applyToJob.mockResolvedValue({ _id: 'a1' });
    const user = userEvent.setup();
    renderApp('/apply/j1', routes);
    expect(await screen.findByText('my-cv.pdf')).toBeTruthy();
    expect(screen.queryByLabelText('Resume file')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Application submitted')).toBeTruthy();
    const form = applyToJob.mock.calls[0][1];
    expect(form.get('useProfileCv')).toBe('true');
    expect(form.get('resume')).toBeNull();
  });

  test('can untick the saved CV and upload a different file', async () => {
    getProfile.mockResolvedValue({ name: 'Jane Doe', email: 'jane@example.com', profile: { phone: '', cv: { originalName: 'my-cv.pdf', size: 1000, uploadedAt: '2026-10-01T00:00:00Z' } } });
    applyToJob.mockResolvedValue({ _id: 'a1' });
    const user = userEvent.setup();
    renderApp('/apply/j1', routes);
    await user.click(await screen.findByRole('checkbox'));
    await user.upload(screen.getByLabelText('Resume file'), cv);
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    await screen.findByText('Application submitted');
    const form = applyToJob.mock.calls[0][1];
    expect(form.get('useProfileCv')).toBeNull();
    expect(form.get('resume').name).toBe('cv.pdf');
  });

  test('closed jobs show a message instead of the form', async () => {
    getJob.mockResolvedValue({ ...JOB, status: 'closed' });
    renderApp('/apply/j1', routes);
    expect(await screen.findByText('This job is no longer accepting applications.')).toBeTruthy();
    expect(screen.queryByLabelText('Full name')).toBeNull();
  });

  test('logged-out visitors must log in first', async () => {
    localStorage.clear();
    renderApp('/apply/j1', [...routes, <Route key="l" path="/login" element={<p>login page</p>} />]);
    expect(await screen.findByText('login page')).toBeTruthy();
  });
});

describe('Job page apply button', () => {
  const routes = [<Route key="j" path="/job/:id" element={<JobPage />} />];

  test('job seekers who already applied see their status link', async () => {
    loggedInAs(SEEKER);
    getJob.mockResolvedValue(JOB);
    getMyApplications.mockResolvedValue({ applications: [{ _id: 'a1' }] });
    renderApp('/job/j1', routes);
    expect(await screen.findByText(/Applied/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Apply now' })).toBeNull();
  });

  test('employers do not get an Apply button', async () => {
    loggedInAs(BOSS);
    getJob.mockResolvedValue(JOB);
    renderApp('/job/j1', routes);
    await screen.findByRole('heading', { name: 'Dev' });
    expect(screen.queryByRole('link', { name: 'Apply now' })).toBeNull();
    expect(getMyApplications).not.toHaveBeenCalled();
  });

  test('visitors see Apply now', async () => {
    getJob.mockResolvedValue(JOB);
    renderApp('/job/j1', routes);
    expect(await screen.findByRole('link', { name: 'Apply now' })).toBeTruthy();
  });
});
