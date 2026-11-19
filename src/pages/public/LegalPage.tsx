import React from 'react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { usePageSeo } from '../../utils/seo';

export const LegalPage: React.FC<{ kind: 'disclaimer' | 'privacy' | 'terms' }> = ({ kind }) => {
  const { settings } = usePortal();

  const map = {
    disclaimer: {
      title: 'Portal Disclaimer',
      body: settings.disclaimer,
      path: '/legal/disclaimer',
    },
    privacy: {
      title: 'Privacy Policy',
      body: settings.privacyPolicy,
      path: '/legal/privacy-policy',
    },
    terms: {
      title: 'Terms & Conditions',
      body: settings.termsAndConditions,
      path: '/legal/terms',
    },
  }[kind];

  usePageSeo({
    title: `${map.title} | Jameel Khan`,
    description: `${map.title} for Jameel Khan Legal Research & Publications Portal.`,
    canonicalPath: map.path,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-slate-200 rounded-md p-8 sm:p-12">
        <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
          Portal Governance
        </p>
        <h1 className="font-serif text-4xl font-bold text-[#0F2342] mb-6 pb-4 border-b border-slate-200">
          {map.title}
        </h1>
        <p className="text-base text-slate-700 leading-relaxed whitespace-pre-line">
          {map.body}
        </p>
      </div>
    </div>
  );
};
