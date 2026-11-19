import React, { useState } from 'react';
import { Check, Copy, Mail, Share2 } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  url?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ title, url }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const links = [
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 mr-1">
        <Share2 className="w-3.5 h-3.5" />
        Share
      </span>
      {links.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target={item.label === 'Email' ? undefined : '_blank'}
          rel={item.label === 'Email' ? undefined : 'noopener noreferrer'}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-[#0F2342] hover:text-[#0F2342] transition-colors whitespace-nowrap"
        >
          {item.label === 'Email' && <Mail className="w-3 h-3 inline mr-1 -mt-0.5" />}
          {item.label}
        </a>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-[#0F2342] hover:text-[#0F2342] transition-colors whitespace-nowrap cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-[#164937]" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Link Copied' : 'Copy Link'}
      </button>
    </div>
  );
};
