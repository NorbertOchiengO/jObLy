import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../services/api', async () => ({ ...(await vi.importActual('../services/api')), getCompanies: vi.fn(), getCompany: vi.fn() }));

import { getCompanies, getCompany } from '../services/api';
import { AuthProvider } from '../context/AuthContext';
import CompaniesPage from '../modules/Build/Companies/CompaniesPage';
import CompanyPage from '../modules/Build/Companies/CompanyPage';

const Probe = () => { const l = useLocation(); return <div data-testid="loc">{l.pathname + l.search}</div>; };
const renderAt = (path, ui, route = '*') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><Routes><Route path={route} element={ui} /></Routes><Probe /></AuthProvider>
    </MemoryRouter>
  );

const C = (n, extra = {}) => ({ _id: `c${n}`, companyName: `Company ${n}`, industry: 'Technology', city: 'Nairobi', openJobs: 2, ...extra });

beforeEach(() => { localStorage.clear(); vi.resetAllMocks(); });

describe('CompaniesPage', () => {
  test('lists companies linking to their pages', async () => {
    getCompanies.mockResolvedValue({ companies: [C(1), C(2, { openJobs: 1 })], total: 2, page: 1, pages: 1 });
    renderAt('/employers', <CompaniesPage />);
    const link = (await screen.findByText('Company 1')).closest('a');
    expect(link.getAttribute('href')).toBe('/employer/c1');
    expect(screen.getByText('2 open jobs')).toBeTruthy();
    expect(screen.getByText('1 open job')).toBeTruthy();
  });

  test('search updates the URL and refetches with filters', async () => {
    getCompanies.mockResolvedValue({ companies: [C(1)], total: 1, page: 1, pages: 1 });
    const user = userEvent.setup();
    renderAt('/employers', <CompaniesPage />);
    await screen.findByText('Company 1');
    await user.type(screen.getByPlaceholderText('Company name'), 'acme');
    await user.type(screen.getByPlaceholderText('City or country'), 'Nairobi');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/employers?q=acme&location=Nairobi'));
    await waitFor(() => expect(getCompanies).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'acme', location: 'Nairobi' })));
  });

  test('empty and error states', async () => {
    getCompanies.mockResolvedValueOnce({ companies: [], total: 0, page: 1, pages: 1 });
    renderAt('/employers?q=zzz', <CompaniesPage />);
    expect(await screen.findByText('No companies found')).toBeTruthy();
  });

  test('error state offers retry', async () => {
    getCompanies.mockRejectedValueOnce({ request: {} }).mockResolvedValue({ companies: [C(1)], total: 1, page: 1, pages: 1 });
    const user = userEvent.setup();
    renderAt('/employers', <CompaniesPage />);
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Company 1')).toBeTruthy();
  });
});

describe('CompanyPage', () => {
  test('shows the company and its open jobs', async () => {
    getCompany.mockResolvedValue({
      company: C(1),
      jobs: [{ _id: 'j1', title: 'Dev', company: 'Company 1', location: 'Nairobi', type: 'Full-Time', createdAt: new Date().toISOString() }],
    });
    renderAt('/employer/c1', <CompanyPage />, '/employer/:id');
    expect(await screen.findByRole('heading', { name: 'Company 1' })).toBeTruthy();
    expect(screen.getByText('Latest jobs (1)')).toBeTruthy();
    expect(screen.getByText('Dev').closest('a').getAttribute('href')).toBe('/job/j1');
  });

  test('shows the public profile: about, details, website link and logo', async () => {
    getCompany.mockResolvedValue({
      company: C(1, { tagline: 'We build things', description: 'Long about text', website: 'https://acme.example', companySize: '51-200', foundedYear: 2012, hasLogo: true, logoVersion: 123 }),
      jobs: [],
    });
    renderAt('/employer/c1', <CompanyPage />, '/employer/:id');
    expect(await screen.findByText('We build things')).toBeTruthy();
    expect(screen.getByText('Long about text')).toBeTruthy();
    expect(screen.getByText('51-200 employees')).toBeTruthy();
    expect(screen.getByText('Founded 2012')).toBeTruthy();
    const site = screen.getByRole('link', { name: /Website/ });
    expect(site.getAttribute('href')).toBe('https://acme.example');
    expect(site.getAttribute('rel')).toContain('noopener');
    expect(screen.getByAltText('Company 1 logo').getAttribute('src')).toMatch(/\/api\/companies\/c1\/logo\?v=123$/);
    expect(screen.getByText('No open positions right now.')).toBeTruthy();
  });

  test('directory cards show the logo and tagline', async () => {
    getCompanies.mockResolvedValue({ companies: [C(1, { hasLogo: true, logoVersion: 5, tagline: 'Hiring builders' })], total: 1, page: 1, pages: 1 });
    renderAt('/employers', <CompaniesPage />);
    expect(await screen.findByText('Hiring builders')).toBeTruthy();
    expect(screen.getByAltText('Company 1 logo')).toBeTruthy();
  });

  test('unknown company shows a friendly message', async () => {
    getCompany.mockRejectedValue({ response: { data: { message: 'Company not found' } } });
    renderAt('/employer/zzz', <CompanyPage />, '/employer/:id');
    expect(await screen.findByText("This company doesn't exist.")).toBeTruthy();
  });
});
