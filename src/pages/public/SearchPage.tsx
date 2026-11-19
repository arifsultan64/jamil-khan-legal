import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { searchAllPublications, trackAnalyticsEvent } from '../../services/firestoreService';
import type { ContentCollection, UnifiedPublication } from '../../types/portal';
import { usePageSeo } from '../../utils/seo';
import { PublicationCard } from '../../components/common/PublicationCard';

const PAGE_SIZE = 12;

export const SearchPage: React.FC = () => {
  const { categories } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();

  const [queryInput, setQueryInput] = useState(searchParams.get('q') || '');
  const [contentType, setContentType] = useState<ContentCollection | 'all'>(
    (searchParams.get('type') as ContentCollection | 'all') || 'all'
  );
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || 'all');
  const [year, setYear] = useState(searchParams.get('year') || 'all');
  const [sortBy, setSortBy] = useState<'relevance' | 'latest'>('relevance');
  const [results, setResults] = useState<UnifiedPublication[]>([]);
  const [allForSuggestions, setAllForSuggestions] = useState<UnifiedPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  usePageSeo({
    title: queryInput ? `Search: ${queryInput} | Jameel Khan` : 'Search Archive | Jameel Khan',
    description: 'Search legal articles, research papers, case laws, judgments, presentations, and lecture notes.',
    canonicalPath: '/search',
  });

  useEffect(() => {
    searchAllPublications({}).then(setAllForSuggestions);
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQueryInput(q);
    setLoading(true);
    setPage(1);
    searchAllPublications({ queryText: q, contentType, categoryId, year, sortBy })
      .then((res) => setResults(res))
      .finally(() => setLoading(false));

    if (q.trim()) {
      trackAnalyticsEvent({ eventType: 'search_query', searchTerm: q.trim() });
    }
  }, [searchParams, contentType, categoryId, year, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (queryInput.trim()) next.set('q', queryInput.trim());
    if (contentType !== 'all') next.set('type', contentType);
    if (categoryId !== 'all') next.set('category', categoryId);
    if (year !== 'all') next.set('year', year);
    setSearchParams(next);
  };

  const suggestions = useMemo(() => {
    const q = queryInput.trim().toLowerCase();
    if (q.length < 2) return [];
    return allForSuggestions
      .filter((item) => item.title.toLowerCase().includes(q) || (item.citation || '').toLowerCase().includes(q))
      .slice(0, 5);
  }, [queryInput, allForSuggestions]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    allForSuggestions.forEach((i) => {
      const y = i.year || (i.publishedAtMs ? new Date(i.publishedAtMs).getFullYear() : 0);
      if (y > 1900) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [allForSuggestions]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paginated = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-slate-200 mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
          Archive Search Engine
        </p>
        <h1 className="font-serif text-4xl font-bold text-[#0F2342] mb-2">
          Search Legal Research &amp; Publications
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Search across titles, keywords, categories, tags, case citations, case numbers, courts, and publication years.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-md p-5 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Enter keywords, title, citation, case number, or court name..."
              aria-label="Search query"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] whitespace-nowrap cursor-pointer"
          >
            Search
          </button>
        </div>

        {/* Live Search Suggestions */}
        {suggestions.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Link
                  key={`${s.collection}-${s.id}`}
                  to={`${s.routeBase}/${s.slug || s.id}`}
                  className="text-xs text-[#0F2342] hover:underline bg-[#FBF9F5] border border-slate-200 px-2.5 py-1 rounded"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentCollection | 'all')}
            aria-label="Filter by content type"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="all">All Content Types</option>
            <option value="articles">Articles</option>
            <option value="research_papers">Research Papers</option>
            <option value="case_laws">Case Laws</option>
            <option value="judgments">Judgments</option>
            <option value="presentations">Presentations</option>
            <option value="lectures">Lecture Notes</option>
            <option value="resources">Educational Resources</option>
          </select>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filter by year"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="all">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'relevance' | 'latest')}
            aria-label="Sort results"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="relevance">Sort: Most Relevant</option>
            <option value="latest">Sort: Latest First</option>
          </select>
        </div>
      </form>

      <p className="text-xs text-slate-500 mb-6 tabular-nums">
        {loading ? 'Searching archive...' : `${results.length} matching publication${results.length === 1 ? '' : 's'} found`}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => <div key={n} className="h-60 bg-white border border-slate-200 rounded-md animate-pulse" />)}
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-[#0F2342] mb-2">No matching publications</h2>
          <p className="text-sm text-slate-600">Try broader keywords or reset category and year filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((item) => (
              <PublicationCard key={`${item.collection}-${item.id}`} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-3 text-xs font-mono tabular-nums text-slate-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 text-xs font-medium bg-white border border-slate-300 rounded-md disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
