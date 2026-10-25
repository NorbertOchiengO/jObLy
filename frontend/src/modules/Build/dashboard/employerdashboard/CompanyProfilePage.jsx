import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteLogo, getCompanyProfile, logoUrl, updateCompanyProfile, uploadLogo } from '../../../../services/api';
import { useAsync } from '../../../../hooks/useAsync';
import { useAuth } from '../../../../context/AuthContext';
import CompanyAvatar from '../../../../components/CompanyAvatar';
import { Field } from '../../../../components/FormFields';
import { Card, ErrorBox, Loading } from '../../../../components/PageState';

const AREA = 'w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:border-primary';
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const MAX_LOGO_MB = 2;

const toForm = (c) => ({
  companyName: c.companyName || '', tagline: c.tagline || '', description: c.description || '', website: c.website || '',
  industry: c.industry || '', companySize: c.companySize || '', foundedYear: c.foundedYear ?? '',
  location: c.location || '', city: c.city || '', address: c.address || ''
});

const Editor = ({ initial }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(() => toForm(initial));
  const [logo, setLogo] = useState({ has: initial.hasLogo, version: initial.logoVersion });
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDirty(true); setSaved(false); };

  const onLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setLogoError('Logo must be a PNG, JPG or WebP image.'); return; }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) { setLogoError(`Logo must be ${MAX_LOGO_MB} MB or smaller.`); return; }
    setUploading(true);
    try {
      const res = await uploadLogo(file);
      setLogo({ has: true, version: res.logoVersion });
    } catch (err) {
      setLogoError(err.response?.data?.message || 'Could not upload the logo.');
    } finally {
      setUploading(false);
    }
  };

  const onRemoveLogo = async () => {
    setLogoError('');
    try { await deleteLogo(); setLogo({ has: false, version: null }); }
    catch (err) { setLogoError(err.response?.data?.message || 'Could not remove the logo.'); }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError(''); setSaved(false);
    if (!form.companyName.trim()) { setError('Company name is required.'); return; }
    setSaving(true);
    try {
      const res = await updateCompanyProfile(form);
      setForm(toForm(res));
      setSaved(true); setDirty(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your company profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-gray-600">This is what job seekers see on your public company page.</p>
        <Link to={`/employer/${user._id}`} className="border border-primary text-primary px-4 py-2 rounded hover:bg-primary hover:text-white">View public page</Link>
      </div>

      <Card title="Logo">
        <div className="flex flex-wrap items-center gap-5">
          <CompanyAvatar name={form.companyName} size="h-24 w-24" logo={logo.has ? logoUrl(user._id, logo.version) : null} />
          <div>
            <label htmlFor="logo-file" className="block text-sm font-medium text-gray-700 mb-1">{logo.has ? 'Replace logo' : 'Upload a logo'}</label>
            <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={onLogo} disabled={uploading} className="p-2 border border-gray-300 rounded-md bg-white" />
            <p className="text-xs text-gray-500 mt-1">PNG, JPG or WebP, up to {MAX_LOGO_MB} MB. A square image works best.</p>
            {logo.has && <button type="button" onClick={onRemoveLogo} className="mt-2 text-sm text-red-700 hover:underline">Remove logo</button>}
            {uploading && <p role="status" className="text-sm text-gray-600 mt-1">Uploading...</p>}
            {logoError && <p role="alert" className="text-sm text-red-600 mt-1">{logoError}</p>}
          </div>
        </div>
      </Card>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Card title="Company details">
          {error && <p role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field id="c-name" label="Company name" value={form.companyName} onChange={set('companyName')} required />
            <Field id="c-tagline" label="Tagline" placeholder="One line about what you do" maxLength={120} value={form.tagline} onChange={set('tagline')} />
            <Field id="c-website" label="Website" placeholder="https://example.com" value={form.website} onChange={set('website')} />
            <Field id="c-industry" label="Industry" value={form.industry} onChange={set('industry')} />
            <div>
              <label htmlFor="c-size" className="block text-sm font-medium text-gray-700 mb-1">Company size</label>
              <select id="c-size" className={AREA} value={form.companySize} onChange={set('companySize')}>
                <option value="">Not specified</option>
                {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
              </select>
            </div>
            <Field id="c-founded" label="Year founded" type="number" min="1800" value={form.foundedYear} onChange={set('foundedYear')} />
            <Field id="c-city" label="City" value={form.city} onChange={set('city')} />
            <Field id="c-location" label="Location" placeholder="e.g. Nairobi, Kenya" value={form.location} onChange={set('location')} />
          </div>
          <div className="mt-5">
            <label htmlFor="c-about" className="block text-sm font-medium text-gray-700 mb-1">About the company</label>
            <textarea id="c-about" rows={6} maxLength={3000} className={AREA} value={form.description} onChange={set('description')} />
            <p className="text-xs text-gray-500 mt-1">{form.description.length} / 3000</p>
          </div>
          <div className="mt-5">
            <Field id="c-address" label="Address (private)" hint="Only you can see this. It is never shown on your public page." value={form.address} onChange={set('address')} />
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving} className="bg-primary text-white py-2 px-8 rounded hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving...' : 'Save company profile'}
          </button>
          {saved && <span role="status" className="text-green-700">Company profile saved</span>}
          {dirty && !saved && <span className="text-sm text-amber-700">You have unsaved changes</span>}
        </div>
      </form>
    </div>
  );
};

const CompanyProfilePage = () => {
  const { data, loading, error, reload } = useAsync(getCompanyProfile, 'company-profile');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return <Editor initial={data} />;
};

export default CompanyProfilePage;
