import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { saveSiteSettingsAdmin } from '../../services/firestoreService';
import type { HomepageSectionConfig, SiteSettings } from '../../types/portal';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../../data/seedData';
import { usePageSeo } from '../../utils/seo';
import { FileUploadField } from '../../components/admin/FileUploadField';

export const AdminSettingsPage: React.FC = () => {
  const { settings, refreshPortalGlobals } = usePortal();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  usePageSeo({
    title: 'Website Settings | Admin CMS',
    description: 'Configure website branding, homepage section ordering, SEO defaults, upload limits, and legal policies.',
    canonicalPath: '/admin/settings',
  });

  useEffect(() => {
    setForm({
      ...settings,
      homepageSections:
        settings.homepageSections && settings.homepageSections.length > 0
          ? [...settings.homepageSections].sort((a, b) => a.order - b.order)
          : DEFAULT_HOMEPAGE_SECTIONS,
    });
  }, [settings]);

  const moveSection = (index: number, delta: -1 | 1) => {
    const list = [...(form.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    const reindexed = list.map((s, idx) => ({ ...s, order: idx + 1 }));
    setForm({ ...form, homepageSections: reindexed });
  };

  const toggleSection = (key: HomepageSectionConfig['key']) => {
    const list = (form.homepageSections || DEFAULT_HOMEPAGE_SECTIONS).map((s) =>
      s.key === key ? { ...s, enabled: !s.enabled } : s
    );
    setForm({ ...form, homepageSections: list });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await saveSiteSettingsAdmin(form);
      await refreshPortalGlobals();
      setMsg('Website settings saved and reflected on the public portal.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Website Settings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Control branding, homepage layout order, contact details, security limits, SEO defaults, and legal policies.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-[#103628] rounded">{msg}</div>}

      {/* Identity & Hero */}
      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#0F2342]">Portal Identity &amp; Hero</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Website Name</label>
            <input type="text" value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
            <input type="text" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Headline</label>
          <input type="text" value={form.heroTitle || ''} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Hero Subtitle</label>
          <textarea rows={2} value={form.heroSubtitle || ''} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Welcome Message</label>
          <textarea rows={2} value={form.welcomeMessage || ''} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Footer Text</label>
          <textarea rows={2} value={form.footerText || ''} onChange={(e) => setForm({ ...form, footerText: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <FileUploadField
            label="Website Logo Image (Optional)"
            accept=".jpg,.jpeg,.png,.webp"
            visibility="public"
            valueUrl={form.logoUrl || ''}
            onUploaded={(info) => setForm({ ...form, logoUrl: info.url })}
            onClear={() => setForm({ ...form, logoUrl: '' })}
          />
          <FileUploadField
            label="Website Favicon Image (Optional)"
            accept=".png,.webp,.jpg,.ico"
            visibility="public"
            valueUrl={form.faviconUrl || ''}
            onUploaded={(info) => setForm({ ...form, faviconUrl: info.url })}
            onClear={() => setForm({ ...form, faviconUrl: '' })}
          />
        </div>
      </section>

      {/* Homepage Section Ordering */}
      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
        <h2 className="font-serif text-xl font-bold text-[#0F2342]">Homepage Sections &amp; Display Order</h2>
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {(form.homepageSections || []).map((sec, idx) => (
            <div key={sec.key} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sec.enabled}
                  onChange={() => toggleSection(sec.key)}
                  className="w-4 h-4 accent-[#0F2342]"
                />
                <span className="font-medium text-slate-800">{sec.label}</span>
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveSection(idx, -1)} className="p-1 text-slate-500 hover:text-[#0F2342] cursor-pointer" title="Move Up">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveSection(idx, 1)} className="p-1 text-slate-500 hover:text-[#0F2342] cursor-pointer" title="Move Down">
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact & Features */}
      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#0F2342]">Contact, Security &amp; Upload Limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Public Contact Email</label>
            <input type="email" value={form.contactEmail || ''} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correspondence Note / Office</label>
            <input type="text" value={form.contactOffice || ''} onChange={(e) => setForm({ ...form, contactOffice: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Upload Limit (MB)</label>
            <input type="number" min={1} max={100} value={form.maxUploadSizeMb} onChange={(e) => setForm({ ...form, maxUploadSizeMb: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Inactivity Auto-Logout (Minutes)</label>
            <input type="number" min={5} max={240} value={form.inactivityTimeoutMinutes || 30} onChange={(e) => setForm({ ...form, inactivityTimeoutMinutes: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.newsletterEnabled} onChange={(e) => setForm({ ...form, newsletterEnabled: e.target.checked })} className="w-4 h-4 accent-[#0F2342]" />
            Enable Newsletter Section
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.contactFormEnabled} onChange={(e) => setForm({ ...form, contactFormEnabled: e.target.checked })} className="w-4 h-4 accent-[#0F2342]" />
            Enable Contact Form
          </label>
        </div>
      </section>

      {/* Default SEO & Legal Pages */}
      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#0F2342]">SEO Defaults &amp; Legal Notices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default SEO Title</label>
            <input type="text" maxLength={160} value={form.defaultSeoTitle || ''} onChange={(e) => setForm({ ...form, defaultSeoTitle: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default SEO Description</label>
            <input type="text" maxLength={320} value={form.defaultSeoDescription || ''} onChange={(e) => setForm({ ...form, defaultSeoDescription: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Disclaimer</label>
          <textarea rows={3} value={form.disclaimer || ''} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Privacy Policy</label>
          <textarea rows={3} value={form.privacyPolicy || ''} onChange={(e) => setForm({ ...form, privacyPolicy: e.target.value })} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Terms &amp; Conditions</label>
          <textarea rows={3} value={form.termsAndConditions || ''} onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
        </div>
      </section>
    </form>
  );
};
