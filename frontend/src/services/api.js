import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

const client = axios.create({ baseURL: API_URL });

// Attach the saved JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says our token is no longer valid, tell the app so it can log out
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const register = (userData) => client.post('/users/register', userData);
export const login = (credentials) => client.post('/users/login', credentials);
export const getMe = () => client.get('/users/me');

export const loginWithGoogle = () => { window.location.href = `${BASE_URL}/auth/google`; };
export const loginWithGitHub = () => { window.location.href = `${BASE_URL}/auth/github`; };
export const loginWithLinkedIn = () => { window.location.href = `${BASE_URL}/auth/linkedin`; };

export const dashboardPathFor = (role) => (role === 'company' ? '/dashboard' : '/clientdashboard');

// ---- Jobs ----
// Drops empty values so the URL / request stays clean
const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const getJobs = async (params) => (await client.get('/jobs', { params: clean(params) })).data;
export const getJob = async (id) => (await client.get(`/jobs/${id}`)).data;
export const getJobMeta = async () => (await client.get('/jobs/meta')).data;

// ---- Applications ----
export const applyToJob = async (jobId, formData) => (await client.post(`/jobs/${jobId}/apply`, formData)).data;
export const getMyApplications = async (params) => (await client.get('/applications/mine', { params: clean(params) })).data;

// ---- Employer ----
export const getMyJobs = async () => (await client.get('/jobs/mine')).data;
export const createJob = async (job) => (await client.post('/jobs', job)).data;
export const updateJob = async (id, changes) => (await client.put(`/jobs/${id}`, changes)).data;
export const deleteJob = async (id) => (await client.delete(`/jobs/${id}`)).data;
export const getReceivedApplications = async (params) => (await client.get('/applications/received', { params: clean(params) })).data;
export const updateApplicationStatus = async (id, status) => (await client.patch(`/applications/${id}/status`, { status })).data;

// Files sit behind login, so fetch with the token and save the blob
const saveBlob = async (path, filename) => {
  const res = await client.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
export const downloadResume = (applicationId, filename = 'resume') => saveBlob(`/applications/${applicationId}/resume`, filename);

// ---- Companies ----
export const getCompanies = async (params) => (await client.get('/companies', { params: clean(params) })).data;
export const getCompany = async (id) => (await client.get(`/companies/${id}`)).data;

// ---- Job seeker profile + CV ----
export const getProfile = async () => (await client.get('/profile')).data;
export const updateProfile = async (profile) => (await client.put('/profile', profile)).data;
export const uploadCv = async (file) => {
  const form = new FormData();
  form.append('cv', file);
  return (await client.post('/profile/cv', form)).data;
};
export const downloadCv = (filename = 'cv') => saveBlob('/profile/cv', filename);
export const deleteCv = async () => (await client.delete('/profile/cv')).data;

// ---- Company profile ----
export const getCompanyProfile = async () => (await client.get('/companies/me')).data;
export const updateCompanyProfile = async (profile) => (await client.put('/companies/me', profile)).data;
export const uploadLogo = async (file) => {
  const form = new FormData();
  form.append('logo', file);
  return (await client.post('/companies/me/logo', form)).data;
};
export const deleteLogo = async () => (await client.delete('/companies/me/logo')).data;
export const logoUrl = (companyId, version) => `${BASE_URL}/api/companies/${companyId}/logo${version ? `?v=${version}` : ''}`;
