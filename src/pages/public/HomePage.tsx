import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, FileText, Gavel, Presentation, Scale, Search } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  fetchAllPublishedUnified,
  subscribeNewsletter,
  trackAnalyticsEvent,
} from '../../services/firestoreService';
import type { HomepageSectionConfig, UnifiedPublication } from '../../types/portal';
import { usePageSeo } from '../../utils/seo';
import { FallbackImage } from '../../components/common/FallbackImage';
import { PublicationCard } from '../../components/common/PublicationCard';
import { DEFAULT_HOMEPAGE_SECTIONS } from '../../data/seedData';

export const HomePage: React.FC = () => {
  const { settings, profile, categories } = usePortal();
  const [publications, setPublications] = useState<UnifiedPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [newsletterError, setNewsletterError] = useState('');
  const navigate = useNavigate();

  usePageSeo({
    title: settings.defaultSeoTitle || 'Jameel Khan | Legal Research & Publications',
    description:
      settings.defaultSeoDescription ||
      'Legal research papers, articles, case laws, judgments, and educational resources published by Jameel Khan.',
    type: 'website',
    canonicalPath: '/',
  });

  useEffect(() => {
    trackAnalyticsEvent({ eventType: 'page_view', title: 'Home' });
    let active = true;
    fetchAllPublishedUnified(24)
      .then((items) => {
        if (active) setPublications(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterError('Please enter a valid email address.');
      setNewsletterState('error');
      return;
    }
    setNewsletterState('submitting');
    setNewsletterError('');
    try {
      await subscribeNewsletter(email);
      setNewsletterState('done');
      setNewsletterEmail('');
    } catch (err) {
      setNewsletterError(err instanceof Error ? err.message : 'Subscription could not be completed.');
      setNewsletterState('error');
    }
  };

  const sections: HomepageSectionConfig[] = (
    settings.homepageSections && settings.homepageSections.length > 0
      ? settings.homepageSections
      : DEFAULT_HOMEPAGE_SECTIONS
  )
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const researchItems = publications.filter((p) => p.collection === 'research_papers');
  const featuredResearch = researchItems.filter((p) => p.isFeatured).slice(0, 3);
  const displayResearch = featuredResearch.length > 0 ? featuredResearch : researchItems.slice(0, 3);

  const latestArticles = publications.filter((p) => p.collection === 'articles').slice(0, 3);
  const recentJudgments = publications.filter((p) => p.collection === 'judgments').slice(0, 4);
  const latestCaseLaws = publications.filter((p) => p.collection === 'case_laws').slice(0, 4);
  const featuredPresentations = publications.filter((p) => p.collection === 'presentations').slice(0, 3);
  const popularPublications = [...publications]
    .sort((a, b) => b.viewCount + b.downloadCount - (a.viewCount + a.downloadCount))
    .slice(0, 4);

  const renderSection = (sec: HomepageSectionConfig) => {
    switch (sec.key) {
      case 'hero':
        return (
          <section key="hero" className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
                <div className="lg:col-span-7 flex flex-col justify-between py-2">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-3">
                      {settings.tagline || 'Legal Research & Publications'}
                    </p>
                    <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0F2342] leading-[1.12] tracking-tight mb-5">
                      {settings.heroTitle || 'Doctrinal Clarity, Judicial Research & Legal Scholarship'}
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mb-4">
                      {settings.heroSubtitle}
                    </p>
                    {settings.welcomeMessage && (
                      <p className="text-sm text-slate-500 leading-relaxed max-w-2xl mb-7">
                        {settings.welcomeMessage}
                      </p>
                    )}

                    {/* Integrated Portal Search Bar */}
                    <form onSubmit={handleHeroSearch} className="max-w-xl mb-7">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search articles, case citations, judgments, statutes..."
                            aria-label="Search legal research and publications"
                            className="w-full pl-10 pr-4 py-3 text-sm bg-[#FBF9F5] border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342] focus:bg-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-3 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Search Archive
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
                    <Link
                      to="/archive"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F2342] hover:text-[#164937]"
                    >
                      Browse Complete Archive
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <span className="text-slate-300" aria-hidden="true">|</span>
                    <Link to="/about" className="text-sm font-medium text-slate-600 hover:text-[#0F2342]">
                      About {profile.fullName || 'Jameel Khan'}
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="h-full min-h-[280px] rounded-md overflow-hidden border border-slate-200 bg-[#0F2342]">
                    <FallbackImage
                      src="/src/assets/images/hero_legal_library_1795074956712.jpg"
                      alt="Classical law library and judicial research chambers"
                      title="Jameel Khan Legal Library"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Navigation Strip across Collection Repositories */}
              <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { to: '/articles', label: 'Legal Articles', icon: FileText, count: publications.filter((p) => p.collection === 'articles').length },
                  { to: '/research', label: 'Research Papers', icon: BookOpen, count: researchItems.length },
                  { to: '/case-laws', label: 'Case Laws', icon: Scale, count: publications.filter((p) => p.collection === 'case_laws').length },
                  { to: '/judgments', label: 'Judgments', icon: Gavel, count: publications.filter((p) => p.collection === 'judgments').length },
                  { to: '/presentations', label: 'Presentations', icon: Presentation, count: publications.filter((p) => p.collection === 'presentations').length },
                  { to: '/resources', label: 'Lectures & Notes', icon: BookOpen, count: publications.filter((p) => p.collection === 'lectures' || p.collection === 'resources').length },
                ].map((nav) => {
                  const Icon = nav.icon;
                  return (
                    <Link
                      key={nav.to}
                      to={nav.to}
                      className="p-4 bg-[#FBF9F5] border border-slate-200 rounded-md hover:border-[#0F2342] transition-colors flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-4 h-4 text-[#164937]" />
                        <span className="font-mono text-xs tabular-nums text-slate-500">
                          {loading ? '—' : nav.count}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#0F2342]">{nav.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );

      case 'featured_research':
        if (!loading && displayResearch.length === 0) return null;
        return (
          <section key="featured_research" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Academic Scholarship</p>
                <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Featured Research Papers</h2>
              </div>
              <Link to="/research" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                All Research Papers &rarr;
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => <div key={n} className="h-64 bg-white border border-slate-200 rounded-md animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayResearch.map((item) => <PublicationCard key={item.id} item={item} showImage />)}
              </div>
            )}
          </section>
        );

      case 'latest_articles':
        if (!loading && latestArticles.length === 0) return null;
        return (
          <section key="latest_articles" className="bg-white border-y border-slate-200 py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Legal Commentary</p>
                  <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Latest Legal Articles</h2>
                </div>
                <Link to="/articles" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                  All Articles &rarr;
                </Link>
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => <div key={n} className="h-64 bg-slate-50 border border-slate-200 rounded-md animate-pulse" />)}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {latestArticles.map((item) => <PublicationCard key={item.id} item={item} showImage />)}
                </div>
              )}
            </div>
          </section>
        );

      case 'recent_judgments':
        if (!loading && recentJudgments.length === 0) return null;
        return (
          <section key="recent_judgments" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Judicial Repository</p>
                <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Recent Judgments</h2>
              </div>
              <Link to="/judgments" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                Judgment Library &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentJudgments.map((item) => <PublicationCard key={item.id} item={item} />)}
            </div>
          </section>
        );

      case 'latest_case_laws':
        if (!loading && latestCaseLaws.length === 0) return null;
        return (
          <section key="latest_case_laws" className="bg-white border-y border-slate-200 py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Precedent Digests</p>
                  <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Latest Case Laws</h2>
                </div>
                <Link to="/case-laws" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                  Case Law Database &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {latestCaseLaws.map((item) => <PublicationCard key={item.id} item={item} />)}
              </div>
            </div>
          </section>
        );

      case 'featured_presentations':
        if (!loading && featuredPresentations.length === 0) return null;
        return (
          <section key="featured_presentations" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Seminars &amp; Lectures</p>
                <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Featured Presentations</h2>
              </div>
              <Link to="/presentations" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                All Presentations &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPresentations.map((item) => <PublicationCard key={item.id} item={item} showImage />)}
            </div>
          </section>
        );

      case 'popular_publications':
        if (!loading && popularPublications.length === 0) return null;
        return (
          <section key="popular_publications" className="bg-white border-y border-slate-200 py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Most Accessed</p>
                  <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Popular Publications</h2>
                </div>
                <Link to="/archive" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                  View Archive &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularPublications.map((item) => <PublicationCard key={item.id} item={item} />)}
              </div>
            </div>
          </section>
        );

      case 'categories':
        return (
          <section key="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="flex items-end justify-between gap-4 pb-4 border-b border-slate-200 mb-8">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">Subject Index</p>
                <h2 className="font-serif text-3xl font-bold text-[#0F2342]">Browse by Categories</h2>
              </div>
              <Link to="/archive" className="text-sm font-medium text-[#0F2342] hover:text-[#164937] whitespace-nowrap">
                Filter Archive &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/archive?category=${encodeURIComponent(cat.id)}`}
                  className="p-5 bg-white border border-slate-200 rounded-md hover:border-[#0F2342] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#0F2342] mb-1.5">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{cat.description}</p>
                    )}
                  </div>
                  <span className="mt-3 text-xs font-medium text-[#164937]">Browse publications &rarr;</span>
                </Link>
              ))}
            </div>
          </section>
        );

      case 'about_author':
        return (
          <section key="about_author" className="bg-white border-y border-slate-200 py-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-4">
                  <div className="aspect-[3/4] max-w-sm rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                    <FallbackImage
                      src={profile.profileImageUrl || '/assets/aistudio/jameel-khan_2505a7a3.jpg'}
                      alt={profile.fullName || 'Jameel Khan'}
                      title={profile.fullName || 'Jameel Khan'}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
                <div className="lg:col-span-8">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
                    About the Author
                  </p>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F2342] mb-2">
                    {profile.fullName}
                  </h2>
                  <p className="text-sm font-medium text-[#9E7B3B] mb-5">{profile.headline}</p>
                  <p className="text-base text-slate-700 leading-relaxed whitespace-pre-line mb-6 max-w-2xl">
                    {profile.biography}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <Link
                      to="/about"
                      className="px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] transition-colors"
                    >
                      View Full Profile
                    </Link>
                    <Link
                      to="/contact"
                      className="px-5 py-2.5 text-sm font-medium text-[#0F2342] border border-slate-300 rounded-md hover:border-[#0F2342] transition-colors"
                    >
                      Contact Chambers
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'newsletter':
        if (!settings.newsletterEnabled) return null;
        return (
          <section key="newsletter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="bg-[#0F2342] text-white rounded-md p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7">
                <p className="text-xs font-mono uppercase tracking-widest text-[#B38D47] mb-2">
                  Research Dispatches
                </p>
                <h2 className="font-serif text-3xl font-bold mb-2">
                  Subscribe to Legal Research Updates
                </h2>
                <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                  Receive notifications when new legal articles, case law digests, research papers, or lecture handouts are published on this portal.
                </p>
              </div>
              <div className="lg:col-span-5">
                {newsletterState === 'done' ? (
                  <div className="p-4 bg-[#103628] border border-[#164937] rounded-md flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                    <span>Your email address has been subscribed for future publication alerts.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Enter your email address"
                        aria-label="Email address for research updates"
                        className="flex-1 px-4 py-3 text-sm bg-white text-slate-900 rounded-md focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={newsletterState === 'submitting'}
                        className="px-5 py-3 text-sm font-semibold bg-[#9E7B3B] text-white rounded-md hover:bg-[#B38D47] transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer"
                      >
                        {newsletterState === 'submitting' ? 'Subscribing...' : 'Subscribe'}
                      </button>
                    </div>
                    {newsletterState === 'error' && (
                      <p className="text-xs text-rose-300">{newsletterError}</p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {sections.map((sec) => renderSection(sec))}

      {!loading && publications.length === 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center">
            <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
              Archive Ready
            </p>
            <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-2">
              No Publications Published Yet
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
              The portal database is connected and ready. Jameel Khan can sign in to the Admin Dashboard to write articles, upload judgments, or optionally initialize demonstration content for testing.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E]"
            >
              Open Admin Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};
