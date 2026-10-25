import { useRef, useState } from 'react';
import { deleteCv, downloadCv, getProfile, updateProfile, uploadCv } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { applyParsed, completeness, describeFilled, mergeSkills } from '../../../../utils/cv';
import { formatDate } from '../../../../utils/format';
import { Field } from '../../../../components/FormFields';
import { Card, ErrorBox, Loading } from '../../../../components/PageState';

const AREA = 'w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-primary';
const MAX_MB = 5;
const ALLOWED = ['.pdf', '.doc', '.docx'];
const EMPTY_EDU = { school: '', degree: '', year: '' };
const EMPTY_EXP = { title: '', company: '', period: '', description: '' };

const toForm = (data) => ({
  name: data.name || '',
  headline: data.profile.headline || '',
  phone: data.profile.phone || '',
  location: data.profile.location || '',
  summary: data.profile.summary || '',
  skills: data.profile.skills || [],
  education: data.profile.education || [],
  experience: data.profile.experience || []
});

const sizeLabel = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function checkCvFile(file) {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED.includes(ext)) return 'Your CV must be a PDF or Word document (.pdf, .doc, .docx).';
  if (file.size > MAX_MB * 1024 * 1024) return `Your CV must be ${MAX_MB} MB or smaller.`;
  return '';
}

const ProfileEditor = ({ initial }) => {
  const [form, setForm] = useState(() => toForm(initial));
  const [cv, setCv] = useState(initial.profile.cv);
  const [skillInput, setSkillInput] = useState('');
  const [suggestion, setSuggestion] = useState(null); // what the last CV upload found
  const [notice, setNotice] = useState('');
  const [cvError, setCvError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const change = (updater) => { setForm(updater); setDirty(true); setSaved(false); };
  const set = (k) => (e) => change((f) => ({ ...f, [k]: e.target.value }));
  const progress = completeness(form, cv);

  const addSkills = () => {
    const items = skillInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length) change((f) => ({ ...f, skills: mergeSkills(f.skills, items) }));
    setSkillInput('');
  };

  const updateRow = (list, i, k, v) => change((f) => ({ ...f, [list]: f[list].map((row, idx) => (idx === i ? { ...row, [k]: v } : row)) }));
  const removeRow = (list, i) => change((f) => ({ ...f, [list]: f[list].filter((_, idx) => idx !== i) }));
  const addRow = (list, empty) => change((f) => ({ ...f, [list]: [...f[list], { ...empty }] }));

  const onCvChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCvError(''); setNotice(''); setSuggestion(null);
    const problem = checkCvFile(file);
    if (problem) { setCvError(problem); return; }

    setUploading(true);
    try {
      const res = await uploadCv(file);
      setCv(res.cv);
      if (res.parsed) {
        const { form: next, filled } = applyParsed(form, res.parsed);
        setSuggestion(res.parsed);
        if (filled.length) { setForm(next); setDirty(true); setSaved(false); }
        setNotice(filled.length
          ? `CV uploaded. We filled in: ${describeFilled(filled)}. Please check everything, then click Save.`
          : 'CV uploaded. Your profile already had everything we could find.');
      } else {
        setNotice(`CV uploaded. ${res.note || ''}`.trim());
      }
    } catch (err) {
      setCvError(err.response?.data?.message || (err.request ? 'Cannot reach the server. Please try again.' : 'Could not upload your CV.'));
    } finally {
      setUploading(false);
    }
  };

  const useCvInstead = () => {
    const { form: next, filled } = applyParsed(form, suggestion, { overwrite: true });
    setForm(next); setDirty(true); setSaved(false);
    setNotice(`Replaced with the details from your CV (${describeFilled(filled) || 'nothing new'}). Click Save to keep them.`);
    setSuggestion(null);
  };

  const removeCv = async () => {
    setCvError('');
    try { await deleteCv(); setCv(null); setSuggestion(null); setNotice('CV removed.'); }
    catch (err) { setCvError(err.response?.data?.message || 'Could not remove your CV.'); }
  };

  const download = async () => {
    setCvError('');
    try { await downloadCv(cv?.originalName || 'cv'); } catch (err) { setCvError('Could not download your CV.'); }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError(''); setSaved(false);
    if (!form.name.trim()) { setError('Your name is required.'); return; }
    setSaving(true);
    try {
      const pending = skillInput.split(',').map((s) => s.trim()).filter(Boolean); // include a skill typed but not yet added
      const payload = { ...form, skills: mergeSkills(form.skills, pending) };
      const res = await updateProfile(payload);
      setForm(toForm(res)); setSkillInput('');
      setSaved(true); setDirty(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Profile completeness</h2>
          <span className="font-bold text-primary">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
          <div className="h-2 bg-primary rounded" style={{ width: `${progress.percent}%` }} />
        </div>
        {progress.missing.length > 0 && <p className="text-sm text-gray-500 mt-2">To finish: add {progress.missing.join(', ')}.</p>}
      </Card>

      <Card title="Your CV">
        {cv ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold break-all">{cv.originalName}</p>
              <p className="text-sm text-gray-500">{sizeLabel(cv.size)} · uploaded {formatDate(cv.uploadedAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className="px-3 py-2 border rounded-md hover:bg-gray-50">Download</button>
              <button type="button" onClick={removeCv} className="px-3 py-2 border rounded-md text-red-700 hover:bg-red-50">Remove</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Upload your CV once and use it for every application. We will also read it to fill in your profile.</p>
        )}

        <div className="mt-4">
          <label htmlFor="cv-file" className="block text-sm font-medium text-gray-700 mb-1">{cv ? 'Replace your CV' : 'Upload your CV'}</label>
          <input id="cv-file" ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={onCvChosen} disabled={uploading} className="w-full p-2 border border-gray-300 rounded-md bg-white" />
          <p className="text-xs text-gray-500 mt-1">PDF or Word, up to {MAX_MB} MB. Auto-fill works best with PDF or .docx files.</p>
          {uploading && <p role="status" className="text-sm text-gray-600 mt-2">Uploading and reading your CV...</p>}
          {cvError && <p role="alert" className="text-sm text-red-600 mt-2">{cvError}</p>}
          {notice && (
            <div role="status" className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-gray-800">
              {notice}
              {suggestion && <button type="button" onClick={useCvInstead} className="ml-2 underline text-primary">Replace my details with the CV&apos;s instead</button>}
            </div>
          )}
        </div>
      </Card>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card title="About you">
          {error && <p role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field id="p-name" label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
            <Field id="p-headline" label="Headline" placeholder="e.g. Frontend Developer" value={form.headline} onChange={set('headline')} maxLength={120} />
            <Field id="p-phone" label="Phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
            <Field id="p-location" label="Location" placeholder="e.g. Nairobi, Kenya" value={form.location} onChange={set('location')} />
          </div>
          <div className="mt-5">
            <label htmlFor="p-summary" className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea id="p-summary" rows={4} maxLength={2000} className={AREA} value={form.summary} onChange={set('summary')} />
          </div>
        </Card>

        <Card title="Skills">
          {form.skills.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-3">
              {form.skills.map((s) => (
                <li key={s} className="bg-purple-50 text-primary text-sm font-semibold pl-3 pr-1 py-1 rounded-full flex items-center">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => change((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))} className="ml-1 w-5 h-5 rounded-full hover:bg-purple-200">&times;</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="p-skill" className="sr-only">Add a skill</label>
              <input
                id="p-skill" className={AREA} placeholder="Add skills, separated by commas" value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkills(); } }}
              />
            </div>
            <button type="button" onClick={addSkills} className="px-4 py-2 border rounded-md hover:bg-gray-50">Add</button>
          </div>
        </Card>

        <Card title="Education">
          {form.education.length === 0 && <p className="text-gray-500 mb-3">No education added yet.</p>}
          {form.education.map((e, i) => (
            <fieldset key={i} className="mb-4 p-4 border rounded-md">
              <legend className="px-1 text-sm text-gray-500">Education {i + 1}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field id={`edu-school-${i}`} label="School / institution" value={e.school} onChange={(ev) => updateRow('education', i, 'school', ev.target.value)} />
                <Field id={`edu-degree-${i}`} label="Qualification" value={e.degree} onChange={(ev) => updateRow('education', i, 'degree', ev.target.value)} />
                <Field id={`edu-year-${i}`} label="Year" value={e.year} onChange={(ev) => updateRow('education', i, 'year', ev.target.value)} maxLength={10} />
              </div>
              <button type="button" onClick={() => removeRow('education', i)} className="mt-3 text-sm text-red-700 hover:underline">Remove education {i + 1}</button>
            </fieldset>
          ))}
          <button type="button" onClick={() => addRow('education', EMPTY_EDU)} className="px-4 py-2 border rounded-md hover:bg-gray-50">+ Add education</button>
        </Card>

        <Card title="Work experience">
          {form.experience.length === 0 && <p className="text-gray-500 mb-3">No experience added yet.</p>}
          {form.experience.map((e, i) => (
            <fieldset key={i} className="mb-4 p-4 border rounded-md">
              <legend className="px-1 text-sm text-gray-500">Experience {i + 1}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field id={`exp-title-${i}`} label="Job title" value={e.title} onChange={(ev) => updateRow('experience', i, 'title', ev.target.value)} />
                <Field id={`exp-company-${i}`} label="Company" value={e.company} onChange={(ev) => updateRow('experience', i, 'company', ev.target.value)} />
                <Field id={`exp-period-${i}`} label="Period" placeholder="e.g. 2021 - Present" value={e.period} onChange={(ev) => updateRow('experience', i, 'period', ev.target.value)} />
              </div>
              <div className="mt-4">
                <label htmlFor={`exp-desc-${i}`} className="block text-sm font-medium text-gray-700 mb-1">What you did</label>
                <textarea id={`exp-desc-${i}`} rows={3} maxLength={1000} className={AREA} value={e.description} onChange={(ev) => updateRow('experience', i, 'description', ev.target.value)} />
              </div>
              <button type="button" onClick={() => removeRow('experience', i)} className="mt-3 text-sm text-red-700 hover:underline">Remove experience {i + 1}</button>
            </fieldset>
          ))}
          <button type="button" onClick={() => addRow('experience', EMPTY_EXP)} className="px-4 py-2 border rounded-md hover:bg-gray-50">+ Add experience</button>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving} className="bg-primary text-white py-2 px-8 rounded hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save profile'}
          </button>
          {saved && <span role="status" className="text-green-700">Profile saved</span>}
          {dirty && !saved && <span className="text-sm text-amber-700">You have unsaved changes</span>}
        </div>
      </form>
    </div>
  );
};

const ProfilePage = () => {
  const { data, loading, error, reload } = useAsync(getProfile, 'profile');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return <ProfileEditor initial={data} />;
};

export default ProfilePage;
