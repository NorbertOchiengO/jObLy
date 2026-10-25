import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../../components/Layout';
import { Field } from '../../../components/FormFields';
import { applyToJob, getJob, getProfile } from '../../../services/api';
import { useAsync } from '../../../hooks/useAsync';
import { useAuth } from '../../../context/AuthContext';
import { isOpen } from '../../../utils/format';

const MAX_MB = 5;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

const validateFile = (file) => {
  if (!file) return 'Please attach your resume.';
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return 'Resume must be a PDF or Word document (.pdf, .doc, .docx).';
  if (file.size > MAX_MB * 1024 * 1024) return `Resume must be ${MAX_MB} MB or smaller.`;
  return '';
};

const ApplyPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: job, loading, error: loadError } = useAsync(() => getJob(id), id);

  // the job seeker's saved profile (for a saved CV and phone number); applying works without it
  const profileState = useAsync(getProfile, 'apply-profile');
  const savedCv = profileState.data?.profile?.cv || null;
  const [useSaved, setUseSaved] = useState(true);
  const usingSaved = !!savedCv && useSaved;

  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneEdited, setPhoneEdited] = useState(false);
  const [phoneValue, setPhone] = useState('');
  const phone = phoneEdited ? phoneValue : (profileState.data?.profile?.phone || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const onFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFileError(f ? validateFile(f) : '');
    setFile(f);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!usingSaved) {
      const problem = validateFile(file);
      if (problem) { setFileError(problem); return; }
    }

    const form = new FormData();
    form.append('fullName', fullName);
    form.append('email', email);
    form.append('phone', phone);
    form.append('coverLetter', coverLetter);
    if (usingSaved) form.append('useProfileCv', 'true');
    else form.append('resume', file);

    setSubmitting(true);
    try {
      await applyToJob(id, form);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || (err.request ? 'Cannot reach the server. Please try again.' : 'Could not submit your application.'));
    } finally {
      setSubmitting(false);
    }
  };

  let body;
  if (loading) {
    body = <div role="status" className="p-8 text-center text-gray-500">Loading...</div>;
  } else if (loadError) {
    body = (
      <div role="alert" className="bg-white p-8 rounded-lg shadow text-center">
        <p className="font-semibold">We couldn&apos;t load this job.</p>
        <Link to="/jobs" className="inline-block mt-4 border border-primary text-primary py-2 px-4 rounded">Browse jobs</Link>
      </div>
    );
  } else if (done) {
    body = (
      <div role="status" className="bg-white p-8 rounded-lg shadow text-center space-y-3">
        <h1 className="text-2xl font-bold">Application submitted</h1>
        <p className="text-gray-600">Thanks! Your application for <strong>{job.title}</strong> at {job.company} is on its way.</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/clientdashboard" className="bg-primary text-white py-2 px-4 rounded">Go to dashboard</Link>
          <Link to="/jobs" className="border border-primary text-primary py-2 px-4 rounded">Keep browsing</Link>
        </div>
      </div>
    );
  } else if (!isOpen(job)) {
    body = (
      <div role="alert" className="bg-white p-8 rounded-lg shadow text-center space-y-3">
        <p className="font-semibold">This job is no longer accepting applications.</p>
        <Link to="/jobs" className="inline-block border border-primary text-primary py-2 px-4 rounded">Browse other jobs</Link>
      </div>
    );
  } else {
    body = (
      <div className="bg-white p-5 sm:p-8 rounded-lg shadow max-w-2xl mx-auto">
        <Link to={`/job/${id}`} className="text-sm text-primary hover:underline">&larr; Back to job</Link>
        <h1 className="text-2xl font-bold mt-3">Apply for {job.title}</h1>
        <p className="text-gray-600 mb-6">{job.company} · {job.location}</p>

        {error && (
          <p role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}{' '}
            {/already applied/i.test(error) && <Link to="/clientdashboard" className="underline">View your applications</Link>}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Field id="fullName" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
          <Field id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Field id="phone" label="Phone (optional)" type="tel" value={phone} onChange={(e) => { setPhoneEdited(true); setPhone(e.target.value); }} autoComplete="tel" />
          <div>
            <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-1">Cover letter (optional)</label>
            <textarea id="coverLetter" rows={5} maxLength={5000} value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-primary" />
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">Resume</p>
            {savedCv && (
              <label className="flex items-start gap-2 mb-2 text-sm">
                <input type="checkbox" checked={useSaved} onChange={(e) => setUseSaved(e.target.checked)} className="mt-1" />
                <span>Use my saved CV (<strong>{savedCv.originalName}</strong>)</span>
              </label>
            )}
            {!usingSaved && (
              <>
                <label htmlFor="resume" className="sr-only">Resume file</label>
                <input id="resume" type="file" accept=".pdf,.doc,.docx" onChange={onFile} className="w-full p-2 border border-gray-300 rounded-md bg-white" />
                <p className="text-xs text-gray-500 mt-1">PDF or Word, up to {MAX_MB} MB. <Link to="/clientdashboard/profile" className="text-primary underline">Save a CV to your profile</Link> to skip this step next time.</p>
              </>
            )}
            {fileError && <p role="alert" className="text-sm text-red-600 mt-1">{fileError}</p>}
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      </div>
    );
  }

  return <Layout>{body}</Layout>;
};

export default ApplyPage;
