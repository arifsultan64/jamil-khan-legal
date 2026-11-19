import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  fetchAllPublishedUnified,
  fetchPublishedCollection,
  normalizeToUnified,
  trackAnalyticsEvent,
} from '../../services/firestoreService';
import type { ContentCollection, UnifiedPublication } from '../../types/portal';
import { usePageSeo } from '../../utils/seo';
import { PublicationCard } from '../../components/common/PublicationCard';

export type CatalogMode =
  | 'articles'
  | 'research_papers'
  | 'case_laws'
  | 'judgments'
  | 'presentations'
  | 'resources'
  | 'archive';

const MODE_CONFIG: Record<CatalogMode, { title: string; subtitle: string; kicker: string }> = {
  articles: {
    kicker: 'Article Library',
    title: 'Legal Articles & Commentary',
    subtitle: 'Analytical articles examining constitutional doctrine, administrative fairness, criminal procedure, and statutory interpretation.',
  },
  research_papers: {
    kicker: 'Academic Scholarship',
    title: 'Research Papers',
    subtitle: 'Full-length doctrinal research papers featuring structured abstracts, methodology, findings, bibliographies, and downloadable PDFs.',
  },
  case_laws: {
    kicker: 'Precedent Database',
    title: 'Case Law Digests',
    subtitle: 'Structured legal principles, statutory provisions, headnotes, and judicial observations searchable by court, citation, and year.',
  },
  judgments: {
    kicker: 'Judgment Library',
    title: 'Judgment Repository',
    subtitle: 'Searchable archive of judgments, case summaries, legal issues, operative orders, and downloadable full-text PDFs.',
  },
  presentations: {
    kicker: 'Seminars & Workshops',
    title: 'Presentations & Slide Decks',
    subtitle: 'Academic PowerPoint and PDF slide decks prepared for judicial academies, legal seminars, and bar workshops.',
  },
  resources: {
    kicker: 'Educational Materials',
    title: 'Lectures & Educational Resources',
    subtitle: 'Lecture notes, judicial training materials, seminar papers, legal guidelines, and academic handouts.',
  },
  archive: {
    kicker: 'Complete Repository',
    title: 'Publications Archive',
    subtitle: 'Centralized archive of all published articles, research papers, case laws, judgments, presentations, and educational resources.',
  },
};

const PAGE_SIZE = 9;

export const CatalogListPage: React.FC<{ mode: CatalogMode }> = ({ mode }) => {
  const { categories } = usePortal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<UnifiedPublication[]>([]);
  const [loading, setLoading] = useState(true);

  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [courtFilter, setCourtFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [resourceKindFilter, setResourceKindFilter] = useState('all');
  const [page, setPage] = useState(1);

  const cfg = MODE_CONFIG[mode];

  usePageSeo({
    title: `${cfg.title} | Jameel Khan`,
    description: cfg.subtitle,
    canonicalPath: window.location.pathname,
  });

  useEffect(() => {
    setCategoryFilter(searchParams.get('category') || 'all');
    setPage(1);
  }, [mode, searchParams]);

  useEffect(() => {
    trackAnalyticsEvent({ eventType: 'page_view', title: cfg.title });
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        if (mode === 'archive') {
          const all = await fetchAllPublishedUnified(60);
          if (active) setItems(all);
        } else if (mode === 'resources') {
          const [lecs, res] = await Promise.all([
            fetchPublishedCollection('lectures', 60),
            fetchPublishedCollection('resources', 60),
          ]);
          const combined = [
            ...lecs.map((l) => normalizeToUnified('lectures', l)),
            ...res.map((r) => normalizeToUnified('resources', r)),
          ].sort((a, b) => b.publishedAtMs - a.publishedAtMs);
          if (active) setItems(combined);
        } else {
          const col = mode as ContentCollection;
          const rows = await fetchPublishedCollection(col, 80);
          if (active) setItems(rows.map((r) => normalizeToUnified(col, r)));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [mode, cfg.title]);

  const availableCourts = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.court) set.add(i.court);
    });
    return Array.from(set).sort();
  }, [items]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    items.forEach((i) => {
      const y = i.year || (i.publishedAtMs ? new Date(i.publishedAtMs).getFullYear() : 0);
      if (y > 1900) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (mode === 'archive' && typeFilter !== 'all' && item.collection !== typeFilter) return false;
      if (courtFilter !== 'all' && item.court !== courtFilter) return false;
      if (yearFilter !== 'all') {
        const y = item.year || (item.publishedAtMs ? new Date(item.publishedAtMs).getFullYear() : 0);
        if (String(y) !== yearFilter) return false;
      }
      if (mode === 'resources' && resourceKindFilter !== 'all' && item.raw?.resourceKind !== resourceKindFilter) {
        return false;
      }
      if (q) {
        const hay = [
          item.title,
          item.description,
          item.categoryName,
          item.citation,
          item.caseNumber,
          item.court,
          ...(item.tags || []),
          ...(item.keywords || []),
          ...(Array.isArray(item.raw?.statutoryProvisions) ? item.raw.statutoryProvisions : []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, typeFilter, courtFilter, yearFilter, resourceKindFilter, queryText, mode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-slate-200 mb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">{cfg.kicker}</p>
        <h1 className="font-serif text-4xl font-bold text-[#0F2342] mb-2">{cfg.title}</h1>
        <p className="text-base text-slate-600 max-w-3xl">{cfg.subtitle}</p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setPage(1);
            }}
            placeholder={
              mode === 'case_laws' || mode === 'judgments'
                ? 'Filter by title, citation, case number, provision...'
                : 'Filter by title, topic, or keywords...'
            }
            aria-label="Filter publications"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => {
            const val = e.target.value;
            setCategoryFilter(val);
            setPage(1);
            if (val === 'all') searchParams.delete('category');
            else searchParams.set('category', val);
            setSearchParams(searchParams, { replace: true });
          }}
          aria-label="Filter by category"
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {mode === 'archive' && (
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by content type"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
          >
            <option value="all">All Content Types</option>
            <option value="articles">Legal Articles</option>
            <option value="research_papers">Research Papers</option>
            <option value="case_laws">Case Laws</option>
            <option value="judgments">Judgments</option>
            <option value="presentations">Presentations</option>
            <option value="lectures">Lecture Notes</option>
            <option value="resources">Educational Resources</option>
          </select>
        )}

        {(mode === 'case_laws' || mode === 'judgments') && availableCourts.length > 0 && (
          <select
            value={courtFilter}
            onChange={(e) => {
              setCourtFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by court"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
          >
            <option value="all">All Courts</option>
            {availableCourts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {mode === 'resources' && (
          <select
            value={resourceKindFilter}
            onChange={(e) => {
              setResourceKindFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by resource type"
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
          >
            <option value="all">All Resource Formats</option>
            <option value="lecture_notes">Lecture Notes</option>
            <option value="training_material">Training Materials</option>
            <option value="seminar_paper">Seminar Papers</option>
            <option value="workshop_resource">Workshop Resources</option>
            <option value="legal_guideline">Legal Guidelines</option>
            <option value="academic_handout">Academic Handouts</option>
          </select>
        )}

        <select
          value={yearFilter}
          onChange={(e) => {
            setYearFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by year"
          className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2342]"
        >
          <option value="all">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-6">
        <span className="tabular-nums">
          {loading ? 'Loading publications...' : `Showing ${filtered.length} published record${filtered.length === 1 ? '' : 's'}`}
        </span>
        {(queryText || categoryFilter !== 'all' || yearFilter !== 'all' || courtFilter !== 'all' || typeFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setQueryText('');
              setCategoryFilter('all');
              setTypeFilter('all');
              setCourtFilter('all');
              setYearFilter('all');
              setResourceKindFilter('all');
              setPage(1);
            }}
            className="text-[#0F2342] font-medium hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-72 bg-white border border-slate-200 rounded-md animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-12 text-center">
          <h2 className="font-serif text-2xl font-semibold text-[#0F2342] mb-2">
            No matching publications found
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Try clearing your search filters or exploring another legal category in the archive.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((item) => (
              <PublicationCard
                key={`${item.collection}-${item.id}`}
                item={item}
                showImage={Boolean(item.featuredImage)}
              />
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
