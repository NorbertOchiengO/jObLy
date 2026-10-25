import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/api', async () => ({
  ...(await vi.importActual('../services/api')),
  getMe: vi.fn(), getProfile: vi.fn(), updateProfile: vi.fn(), uploadCv: vi.fn(), deleteCv: vi.fn(), downloadCv: vi.fn(),
  getCompanyProfile: vi.fn(), updateCompanyProfile: vi.fn(), uploadLogo: vi.fn(), deleteLogo: vi.fn(),
  getJobMeta: vi.fn(),
}));

import * as api from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import ProfilePage from '../modules/Build/dashboard/EmployeeDashboard/ProfilePage';
import CompanyProfilePage from '../modules/Build/dashboard/employerdashboard/CompanyProfilePage';
import Explore from '../modules/Landing/components/explore';

const SEEKER = { _id: 's1', name: 'Jane Doe', email: 'jane@example.com', role: 'individual' };
const BOSS = { _id: 'b1', name: 'Boss', email: 'b@x.co', role: 'company', companyName: 'Acme' };
const pdf = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });

const renderPage = (ui, user) => {
  localStorage.setItem('token', 't');
  api.getMe.mockResolvedValue({ data: user });
  return render(<MemoryRouter><AuthProvider><Routes><Route path="*" element={ui} /></Routes></AuthProvider></MemoryRouter>);
};

const PROFILE = (extra = {}) => ({
  name: 'Jane Doe', email: 'jane@example.com',
  profile: { headline: '', phone: '', location: '', summary: '', skills: [], education: [], experience: [], cv: null, ...extra },
});
const PARSED = {
  headline: 'Frontend Developer', phone: '0712 345 678', location: 'Nairobi, Kenya', summary: 'Builds things.',
  skills: ['React', 'Figma'], education: [{ school: 'UoN', degree: 'BSc CS', year: '2018' }],
  experience: [{ title: 'Dev', company: 'Savannah Labs', period: '2020 - Present', description: 'Stuff' }],
};

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

describe('job seeker profile page', () => {
  test('loads the profile and shows completeness', async () => {
    api.getProfile.mockResolvedValue(PROFILE({ headline: 'Designer' }));
    renderPage(<ProfilePage />, SEEKER);
    expect((await screen.findByLabelText('Headline')).value).toBe('Designer');
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('13');
    expect(screen.getByText(/To finish: add/)).toBeTruthy();
  });

  test('uploading a CV fills the empty fields for review and nothing is saved until Save', async () => {
    api.getProfile.mockResolvedValue(PROFILE({ headline: 'My own headline' }));
    api.uploadCv.mockResolvedValue({ cv: { originalName: 'cv.pdf', size: 2048, uploadedAt: '2026-10-15T00:00:00Z' }, parsed: PARSED, note: '' });
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await user.upload(await screen.findByLabelText('Upload your CV'), pdf);

    expect(await screen.findByText(/We filled in:/)).toBeTruthy();
    expect(screen.getByLabelText('Headline').value).toBe('My own headline'); // not overwritten
    expect(screen.getByLabelText('Phone').value).toBe('0712 345 678');
    expect(screen.getByLabelText('Location').value).toBe('Nairobi, Kenya');
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByLabelText('School / institution').value).toBe('UoN');
    expect(screen.getByLabelText('Company').value).toBe('Savannah Labs');
    expect(screen.getByText('cv.pdf')).toBeTruthy();
    expect(screen.getByText('You have unsaved changes')).toBeTruthy();
    expect(api.updateProfile).not.toHaveBeenCalled();
  });

  test('"replace my details with the CV\'s" overwrites existing values', async () => {
    api.getProfile.mockResolvedValue(PROFILE({ headline: 'My own headline' }));
    api.uploadCv.mockResolvedValue({ cv: { originalName: 'cv.pdf', size: 10, uploadedAt: '2026-10-15T00:00:00Z' }, parsed: PARSED, note: '' });
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await user.upload(await screen.findByLabelText('Upload your CV'), pdf);
    await user.click(await screen.findByRole('button', { name: /Replace my details/ }));
    expect(screen.getByLabelText('Headline').value).toBe('Frontend Developer');
  });

  test('a CV that cannot be read is still saved and the note is shown', async () => {
    api.getProfile.mockResolvedValue(PROFILE());
    api.uploadCv.mockResolvedValue({ cv: { originalName: 'scan.pdf', size: 10, uploadedAt: '2026-10-15T00:00:00Z' }, parsed: null, note: "couldn't find readable text" });
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await user.upload(await screen.findByLabelText('Upload your CV'), pdf);
    expect(await screen.findByText(/couldn't find readable text/)).toBeTruthy();
    expect(screen.getByText('scan.pdf')).toBeTruthy();
  });

  test('rejects a wrong file type before uploading, and shows server errors', async () => {
    api.getProfile.mockResolvedValue(PROFILE());
    const user = userEvent.setup({ applyAccept: false });
    renderPage(<ProfilePage />, SEEKER);
    await user.upload(await screen.findByLabelText('Upload your CV'), new File(['x'], 'pic.png', { type: 'image/png' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/PDF or Word/);
    expect(api.uploadCv).not.toHaveBeenCalled();

    api.uploadCv.mockRejectedValue({ response: { data: { message: 'CV must be 5 MB or smaller' } } });
    await user.upload(screen.getByLabelText('Upload your CV'), pdf);
    expect((await screen.findByRole('alert')).textContent).toBe('CV must be 5 MB or smaller');
  });

  test('saves everything, including a skill typed but not yet added', async () => {
    api.getProfile.mockResolvedValue(PROFILE());
    api.updateProfile.mockImplementation(async (p) => ({ name: p.name, email: 'jane@example.com', profile: { ...p, cv: null } }));
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await user.type(await screen.findByLabelText('Headline'), 'Designer');
    await user.type(screen.getByLabelText('Add a skill'), 'Figma, Sketching');
    await user.click(screen.getByRole('button', { name: '+ Add education' }));
    await user.type(screen.getByLabelText('School / institution'), 'UoN');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(api.updateProfile).toHaveBeenCalled());
    const sent = api.updateProfile.mock.calls[0][0];
    expect(sent).toMatchObject({ name: 'Jane Doe', headline: 'Designer', skills: ['Figma', 'Sketching'] });
    expect(sent.education[0].school).toBe('UoN');
    expect(await screen.findByText('Profile saved')).toBeTruthy();
  });

  test('skills and rows can be removed; name is required; server errors are shown', async () => {
    api.getProfile.mockResolvedValue(PROFILE({ skills: ['React', 'Figma'], experience: [{ title: 'Dev', company: 'A', period: '', description: '' }] }));
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await user.click(await screen.findByRole('button', { name: 'Remove React' }));
    expect(screen.queryByText('React')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove experience 1' }));
    expect(screen.getByText('No experience added yet.')).toBeTruthy();

    await user.clear(screen.getByLabelText('Full name'));
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/name is required/);
    expect(api.updateProfile).not.toHaveBeenCalled();

    api.updateProfile.mockRejectedValue({ response: { data: { message: 'Could not save' } } });
    await user.type(screen.getByLabelText('Full name'), 'Jane');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Could not save');
  });

  test('a saved CV can be downloaded and removed', async () => {
    api.getProfile.mockResolvedValue(PROFILE({ cv: { originalName: 'my-cv.pdf', size: 5000, uploadedAt: '2026-10-01T00:00:00Z' } }));
    api.deleteCv.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage(<ProfilePage />, SEEKER);
    await screen.findByText('my-cv.pdf');
    await user.click(screen.getByRole('button', { name: 'Download' }));
    expect(api.downloadCv).toHaveBeenCalledWith('my-cv.pdf');
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText('my-cv.pdf')).toBeNull());
    expect(screen.getByLabelText('Upload your CV')).toBeTruthy();
  });
});

describe('company profile page', () => {
  const COMPANY = (extra = {}) => ({ companyName: 'Acme', tagline: '', description: '', website: '', industry: 'Tech', companySize: '', foundedYear: null, location: '', city: '', address: 'Secret St', hasLogo: false, logoVersion: null, ...extra });

  test('loads, edits and saves the profile', async () => {
    api.getCompanyProfile.mockResolvedValue(COMPANY());
    api.updateCompanyProfile.mockImplementation(async (p) => ({ ...COMPANY(), ...p }));
    const user = userEvent.setup();
    renderPage(<CompanyProfilePage />, BOSS);
    expect((await screen.findByLabelText('Company name')).value).toBe('Acme');
    await user.type(screen.getByLabelText('Tagline'), 'We build things');
    await user.type(screen.getByLabelText('Website'), 'acme.co.ke');
    await user.selectOptions(screen.getByLabelText('Company size'), '51-200');
    await user.type(screen.getByLabelText('About the company'), 'We are great.');
    await user.click(screen.getByRole('button', { name: 'Save company profile' }));
    await waitFor(() => expect(api.updateCompanyProfile).toHaveBeenCalled());
    expect(api.updateCompanyProfile.mock.calls[0][0]).toMatchObject({ tagline: 'We build things', website: 'acme.co.ke', companySize: '51-200', description: 'We are great.' });
    expect(await screen.findByText('Company profile saved')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View public page' }).getAttribute('href')).toBe('/employer/b1');
    expect(screen.getByText(/Only you can see this/)).toBeTruthy();
  });

  test('requires a company name and shows server errors', async () => {
    api.getCompanyProfile.mockResolvedValue(COMPANY());
    api.updateCompanyProfile.mockRejectedValue({ response: { data: { message: 'Please enter a valid website address, e.g. https://example.com' } } });
    const user = userEvent.setup();
    renderPage(<CompanyProfilePage />, BOSS);
    await user.clear(await screen.findByLabelText('Company name'));
    await user.click(screen.getByRole('button', { name: 'Save company profile' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/name is required/);
    await user.type(screen.getByLabelText('Company name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Save company profile' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/valid website/);
  });

  test('logo: upload shows the image, bad files are rejected, and it can be removed', async () => {
    api.getCompanyProfile.mockResolvedValue(COMPANY());
    api.uploadLogo.mockResolvedValue({ hasLogo: true, logoVersion: 42 });
    api.deleteLogo.mockResolvedValue({ hasLogo: false });
    const user = userEvent.setup({ applyAccept: false });
    renderPage(<CompanyProfilePage />, BOSS);
    const input = await screen.findByLabelText('Upload a logo');

    await user.upload(input, new File(['x'], 'logo.svg', { type: 'image/svg+xml' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/PNG, JPG or WebP/);
    expect(api.uploadLogo).not.toHaveBeenCalled();

    await user.upload(screen.getByLabelText('Upload a logo'), new File(['x'], 'logo.png', { type: 'image/png' }));
    expect((await screen.findByAltText('Acme logo')).getAttribute('src')).toMatch(/\/api\/companies\/b1\/logo\?v=42$/);

    await user.click(screen.getByRole('button', { name: 'Remove logo' }));
    await waitFor(() => expect(screen.queryByAltText('Acme logo')).toBeNull());
  });
});

describe('Explore section', () => {
  const renderExplore = () => render(<MemoryRouter><Explore /></MemoryRouter>);

  test('shows real categories and counts linking to filtered job lists', async () => {
    api.getJobMeta.mockResolvedValue({ industryCounts: [{ name: 'Technology', count: 17 }, { name: 'Human Resources', count: 1 }] });
    renderExplore();
    const tech = (await screen.findByText('Technology')).closest('a');
    expect(tech.getAttribute('href')).toBe('/jobs?industry=Technology');
    expect(within(tech).getByText(/17 jobs available/)).toBeTruthy();
    const hr = screen.getByText('Human Resources').closest('a');
    expect(hr.getAttribute('href')).toBe('/jobs?industry=Human%20Resources');
    expect(within(hr).getByText(/1 job available/)).toBeTruthy();
  });

  test('shows at most the 8 busiest categories', async () => {
    api.getJobMeta.mockResolvedValue({ industryCounts: Array.from({ length: 12 }, (_, i) => ({ name: `Cat ${i}`, count: 20 - i })) });
    renderExplore();
    await screen.findByText('Cat 0');
    expect(screen.queryByText('Cat 8')).toBeNull();
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  test('error state offers retry', async () => {
    api.getJobMeta.mockRejectedValueOnce({ request: {} }).mockResolvedValue({ industryCounts: [{ name: 'Design', count: 9 }] });
    const user = userEvent.setup();
    renderExplore();
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Design')).toBeTruthy();
  });
});
