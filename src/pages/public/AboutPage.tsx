import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalAuthContext';
import { trackAnalyticsEvent } from '../../services/firestoreService';
import { usePageSeo } from '../../utils/seo';
import { FallbackImage } from '../../components/common/FallbackImage';

export const AboutPage: React.FC = () => {
  const { profile } = usePortal();

  usePageSeo({
    title: `About ${profile.fullName} | Legal Research & Publications`,
    description: profile.headline || 'Professional biography, academic background, and research interests of Jameel Khan.',
    type: 'website',
    canonicalPath: '/about',
    structuredData: {
      '@type': 'Person',
      name: profile.fullName,
      description: profile.headline,
    },
  });

  useEffect(() => {
    trackAnalyticsEvent({ eventType: 'page_view', title: 'About' });
  }, []);

  const sections = [
    { title: 'Professional Biography', body: profile.biography },
    { title: 'Academic Background', body: profile.academicBackground },
    { title: 'Professional Experience', body: profile.professionalExperience },
    { title: 'Judicial Career', body: profile.judicialCareer },
    { title: 'Academic Contributions', body: profile.academicContributions },
    { title: 'Professional Achievements', body: profile.achievements },
  ].filter((s) => Boolean(s.body && s.body.trim()));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 pb-6 border-b border-slate-200">
        <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
          Author Profile
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0F2342] mb-2">
          {profile.fullName}
        </h1>
        <p className="text-base text-[#9E7B3B] font-medium">{profile.headline}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <aside className="lg:col-span-4 space-y-6">
          <div className="aspect-[3/4] rounded-md overflow-hidden border border-slate-200 bg-white">
            <FallbackImage
              src={profile.profileImageUrl || '/assets/aistudio/jameel-khan_2505a7a3.jpg'}
              alt={profile.fullName || 'Jameel Khan'}
              title={profile.fullName || 'Jameel Khan'}
              className="w-full h-full object-cover object-top"
            />
          </div>

          {profile.researchInterests && profile.researchInterests.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md p-6">
              <h2 className="font-serif text-xl font-semibold text-[#0F2342] mb-3">
                Research Interests
              </h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {profile.researchInterests.map((interest) => (
                  <li key={interest} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                    {interest}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-[#F4F0E8] border border-slate-200 rounded-md p-6">
            <h2 className="font-serif text-lg font-semibold text-[#0F2342] mb-2">
              Explore Publications
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Access published articles, academic papers, case digests, and lectures across all legal disciplines.
            </p>
            <div className="flex flex-col gap-2 text-sm font-medium">
              <Link to="/articles" className="text-[#0F2342] hover:text-[#164937]">Legal Articles &rarr;</Link>
              <Link to="/research" className="text-[#0F2342] hover:text-[#164937]">Research Papers &rarr;</Link>
              <Link to="/judgments" className="text-[#0F2342] hover:text-[#164937]">Judgment Repository &rarr;</Link>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-8 space-y-8">
          {sections.map((sec) => (
            <section key={sec.title} className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
              <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3 pb-2 border-b border-slate-100">
                {sec.title}
              </h2>
              <p className="text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {sec.body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
