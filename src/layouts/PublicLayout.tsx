import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';
import { usePortal } from '../contexts/PortalAuthContext';
import { getDriveImageRenderUrl } from '../utils/driveUrls';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, categories } = usePortal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/articles', label: 'Articles' },
    { to: '/research', label: 'Research' },
    { to: '/case-laws', label: 'Case Laws' },
    { to: '/judgments', label: 'Judgments' },
    { to: '/archive', label: 'Archive' },
  ];

  const secondaryLinks = [
    { to: '/', label: 'Home' },
    { to: '/presentations', label: 'Presentations' },
    { to: '/resources', label: 'Lectures & Resources' },
    { to: '/about', label: 'About Author' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#141A24]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-serif text-2xl font-bold tracking-tight text-[#0F2342] whitespace-nowrap shrink-0"
          >
            {settings.logoUrl && (
              <img
                src={getDriveImageRenderUrl(settings.logoUrl)}
                alt={settings.siteName || 'Jameel Khan'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 object-contain rounded shrink-0"
              />
            )}
            <span>{settings.siteName || 'Jameel Khan'}</span>
          </Link>

          {/* Zone 2: 5 Concise Single-Line Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Primary Navigation">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#0F2342] border-[#0F2342]'
                      : 'border-transparent hover:text-[#0F2342] hover:border-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Search Archive
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2.5 text-slate-700 hover:text-[#0F2342] border border-slate-200 rounded-md cursor-pointer"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1">
            {[...secondaryLinks.slice(0, 1), ...navLinks, ...secondaryLinks.slice(1)].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive ? 'bg-[#0F2342] text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Academic Institutional Footer */}
      <footer className="bg-[#091529] text-slate-300 border-t border-[#18345E] mt-20 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
            <div>
              <p className="font-serif text-2xl font-bold text-white mb-1">{settings.siteName}</p>
              <p className="text-xs uppercase tracking-widest text-[#B38D47] mb-4">
                {settings.tagline}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed">
                {settings.footerText}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
                Publications
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/articles" className="hover:text-white transition-colors">Legal Articles</Link></li>
                <li><Link to="/research" className="hover:text-white transition-colors">Research Papers</Link></li>
                <li><Link to="/case-laws" className="hover:text-white transition-colors">Case Law Database</Link></li>
                <li><Link to="/judgments" className="hover:text-white transition-colors">Judgment Repository</Link></li>
                <li><Link to="/presentations" className="hover:text-white transition-colors">Presentations</Link></li>
                <li><Link to="/resources" className="hover:text-white transition-colors">Lectures &amp; Resources</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
                Practice Areas
              </h3>
              <ul className="space-y-2.5 text-sm">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/archive?category=${encodeURIComponent(cat.id)}`}
                      className="hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
                Portal &amp; Governance
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Jameel Khan</Link></li>
                <li><Link to="/archive" className="hover:text-white transition-colors">Publications Archive</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/legal/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
                <li><Link to="/legal/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
                <li className="pt-2">
                  <Link to="/admin/login" className="text-xs text-[#B38D47] hover:text-white transition-colors">
                    Administrator Sign In
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
            <p>&copy; {new Date().getFullYear()} {settings.siteName} — {settings.tagline}. Personal academic research portal (not an official court or government site).</p>
            <div className="flex items-center gap-4">
              <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                API v1 Docs
              </a>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
