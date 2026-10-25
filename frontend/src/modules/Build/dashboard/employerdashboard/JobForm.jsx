import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createJob, getJob, updateJob } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { useAuth } from '../../../../context/AuthContext';
import { Field } from '../../../../components/FormFields';
import { Card, ErrorBox, Loading } from '../../../../components/PageState';

const TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'];
const MODES = ['On-site', 'Remote', 'Hybrid'];
const AREA = 'w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-primary';

const toForm = (job) => ({
  title: job.title || '',
  company: job.company || '',
  location: job.location || '',
  type: job.type || 'Full-Time',
  workMode: job.workMode || 'On-site',
  industry: job.industry || '',
  categories: (job.categories || []).join(', '),
  salaryMin: job.salaryMin ?? '',
  salaryMax: job.salaryMax ?? '',
  deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
  description: job.description || '',
  responsibilities: job.responsibilities || '',
  qualifications: job.qualifications || '',
  status: job.status || 'open'
});

const Select = ({ id, label, value, onChange, options }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select id={id} value={value} onChange={onChange} className={AREA}>
      {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

const Form = ({ job, jobId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => toForm(job || { company: user?.companyName, location: user?.location }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!form.title.trim() || !form.company.trim() || !form.location.trim() || !form.description.trim()) {
      setError('Title, company, location and description are required.');
      return;
    }
    if (form.salaryMin !== '' && form.salaryMax !== '' && Number(form.salaryMin) > Number(form.salaryMax)) {
      setError('Minimum salary cannot be higher than maximum salary.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!jobId) delete payload.status; // new jobs start open
      if (jobId) await updateJob(jobId, payload);
      else await createJob(payload);
      navigate('/dashboard/jobs');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the job. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Card title={jobId ? 'Edit job' : 'Post a job'} className="max-w-3xl">
      {error && <p role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</p>}
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field id="title" label="Job title" value={form.title} onChange={set('title')} required />
          <Field id="company" label="Company" value={form.company} onChange={set('company')} required />
          <Field id="location" label="Location" value={form.location} onChange={set('location')} required />
          <Field id="industry" label="Industry" value={form.industry} onChange={set('industry')} />
          <Select id="type" label="Job type" value={form.type} onChange={set('type')} options={TYPES} />
          <Select id="workMode" label="Work mode" value={form.workMode} onChange={set('workMode')} options={MODES} />
          <Field id="salaryMin" label="Minimum salary (KES)" type="number" min="0" value={form.salaryMin} onChange={set('salaryMin')} />
          <Field id="salaryMax" label="Maximum salary (KES)" type="number" min="0" value={form.salaryMax} onChange={set('salaryMax')} />
          <Field id="deadline" label="Application deadline" type="date" value={form.deadline} onChange={set('deadline')} />
          <Field id="categories" label="Skills / tags" hint="Separate with commas, e.g. React, Node.js" value={form.categories} onChange={set('categories')} />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Job description</label>
          <textarea id="description" rows={5} className={AREA} value={form.description} onChange={set('description')} required />
        </div>
        <div>
          <label htmlFor="responsibilities" className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
          <textarea id="responsibilities" rows={4} className={AREA} value={form.responsibilities} onChange={set('responsibilities')} />
          <p className="text-xs text-gray-500 mt-1">One per line</p>
        </div>
        <div>
          <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700 mb-1">Qualifications</label>
          <textarea id="qualifications" rows={4} className={AREA} value={form.qualifications} onChange={set('qualifications')} />
          <p className="text-xs text-gray-500 mt-1">One per line</p>
        </div>
        {jobId && (
          <Select
            id="status" label="Status" value={form.status} onChange={set('status')}
            options={[{ value: 'open', label: 'Open - accepting applications' }, { value: 'closed', label: 'Closed' }]}
          />
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-primary text-white py-2 px-6 rounded hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving...' : jobId ? 'Save changes' : 'Post job'}
          </button>
          <Link to="/dashboard/jobs" className="border py-2 px-6 rounded hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </Card>
  );
};

const JobForm = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: job, loading, error, reload } = useAsync(() => (id ? getJob(id) : Promise.resolve(null)), id || 'new');

  if (id) {
    if (loading) return <Loading />;
    if (error) return <ErrorBox message={error} onRetry={reload} />;
    if (String(job.employer) !== String(user._id)) return <ErrorBox message="You can only edit your own jobs." />;
  }
  return <Form key={id || 'new'} job={job} jobId={id} />;
};

export default JobForm;
