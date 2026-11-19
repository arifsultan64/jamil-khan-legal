import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { saveProfileAdmin } from '../../services/firestoreService';
import { usePageSeo } from '../../utils/seo';
import { FileUploadField } from '../../components/admin/FileUploadField';
import { FallbackImage } from '../../components/common/FallbackImage';

export const AdminProfilePage: React.FC = () => {
  const { profile, refreshPortalGlobals } = usePortal();
  const [fullName, setFullName] = useState(profile.fullName || 'Jameel Khan');
  const [headline, setHeadline] = useState(profile.headline || '');
  const [biography, setBiography] = useState(profile.biography || '');
  const [academicBackground, setAcademicBackground] = useState(profile.academicBackground || '');
  const [professionalExperience, setProfessionalExperience] = useState(profile.professionalExperience || '');
  const [judicialCareer, setJudicialCareer] = useState(profile.judicialCareer || '');
  const [researchInterestsText, setResearchInterestsText] = useState((profile.researchInterests || []).join(', '));
  const [academicContributions, setAcademicContributions] = useState(profile.academicContributions || '');
  const [achievements, setAchievements] = useState(profile.achievements || '');
  const [profileImageUrl, setProfileImageUrl] = useState(profile.profileImageUrl || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  usePageSeo({
    title: 'Author Profile Editor | Admin CMS',
    description: 'Edit author biography, academic credentials, and profile photograph.',
    canonicalPath: '/admin/profile',
  });

  useEffect(() => {
    setFullName(profile.fullName || 'Jameel Khan');
    setHeadline(profile.headline || '');
    setBiography(profile.biography || '');
    setAcademicBackground(profile.academicBackground || '');
    setProfessionalExperience(profile.professionalExperience || '');
    setJudicialCareer(profile.judicialCareer || '');
    setResearchInterestsText((profile.researchInterests || []).join(', '));
    setAcademicContributions(profile.academicContributions || '');
    setAchievements(profile.achievements || '');
    setProfileImageUrl(profile.profileImageUrl || '');
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await saveProfileAdmin({
        fullName,
        headline,
        biography,
        academicBackground,
        professionalExperience,
        judicialCareer,
        researchInterests: researchInterestsText.split(',').map((s) => s.trim()).filter(Boolean),
        academicContributions,
        achievements,
        profileImageUrl,
      });
      await refreshPortalGlobals();
      setMsg('Author profile updated and published to the About page.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Author Profile &amp; Biography</h1>
          <p className="text-xs text-slate-500 mt-1">
            All biographical details, judicial background, and photographs displayed on the public About page.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-[#103628] rounded">{msg}</div>}

      <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Headline</label>
            <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-24 aspect-[3/4] rounded-md overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <FallbackImage
              src={profileImageUrl || '/assets/aistudio/jameel-khan_2505a7a3.jpg'}
              alt={fullName || 'Jameel Khan'}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="flex-1 min-w-0">
            <FileUploadField
              label="Profile & Author Photograph (JPG, PNG, WebP)"
              accept=".jpg,.jpeg,.png,.webp"
              visibility="public"
              valueUrl={profileImageUrl}
              onUploaded={(info) => setProfileImageUrl(info.url)}
              onClear={() => setProfileImageUrl('/assets/aistudio/jameel-khan_2505a7a3.jpg')}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Biography *</label>
          <textarea rows={5} required value={biography} onChange={(e) => setBiography(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Background</label>
          <textarea rows={3} value={academicBackground} onChange={(e) => setAcademicBackground(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Experience</label>
          <textarea rows={3} value={professionalExperience} onChange={(e) => setProfessionalExperience(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Judicial Career</label>
          <textarea rows={3} value={judicialCareer} onChange={(e) => setJudicialCareer(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Research Interests (comma separated)</label>
          <input type="text" value={researchInterestsText} onChange={(e) => setResearchInterestsText(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Contributions</label>
          <textarea rows={3} value={academicContributions} onChange={(e) => setAcademicContributions(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Achievements</label>
          <textarea rows={3} value={achievements} onChange={(e) => setAchievements(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
        </div>
      </div>
    </form>
  );
};
