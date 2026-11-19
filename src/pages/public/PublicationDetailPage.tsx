import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Eye, ExternalLink, FileText, Printer } from 'lucide-react';
import {
  COLLECTION_META,
  fetchPublishedBySlugOrId,
  fetchPublishedCollection,
  normalizeToUnified,
  trackAnalyticsEvent,
} from '../../services/firestoreService';
import type { ContentCollection, UnifiedPublication } from '../../types/portal';
import {
  estimateReadingTimeMinutes,
  extractHeadingsAndInjectIds,
  formatBytes,
  formatDisplayDate,
  sanitizeHtml,
} from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';
import { FallbackImage } from '../../components/common/FallbackImage';
import { ShareButtons } from '../../components/common/ShareButtons';
import { PdfViewerModal } from '../../components/common/PdfViewerModal';
import { PublicationCard } from '../../components/common/PublicationCard';
import { usePortal } from '../../contexts/PortalAuthContext';
import { getDriveDownloadUrl, isGoogleDriveUrl } from '../../utils/driveUrls';

export const PublicationDetailPage: React.FC<{ collectionName: ContentCollection }> = ({ collectionName }) => {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = usePortal();
  const [docData, setDocData] = useState<any | null>(null);
  const [related, setRelated] = useState<UnifiedPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  const meta = COLLECTION_META[collectionName];

  usePageSeo({
    title: docData?.seoTitle || docData?.title || meta.label,
    description: docData?.seoDescription || docData?.description || docData?.abstract || 'Published legal research by Jameel Khan.',
    type: 'article',
    canonicalPath: `${meta.routeBase}/${slug || ''}`,
    structuredData: docData
      ? {
          '@type': 'ScholarlyArticle',
          headline: docData.title,
          author: { '@type': 'Person', name: docData.authorName || 'Jameel Khan' },
          description: docData.description || docData.abstract || '',
        }
      : undefined,
  });

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) setReadingProgress(0);
      else setReadingProgress(Math.min(100, Math.round((window.scrollY / docHeight) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        let found = await fetchPublishedBySlugOrId(collectionName, slug);
        // Resources route serves both lectures and resources collections
        let actualCollection = collectionName;
        if (!found && collectionName === 'resources') {
          found = await fetchPublishedBySlugOrId('lectures', slug);
          if (found) actualCollection = 'lectures';
        }
        if (active && found) {
          setDocData(found);
          trackAnalyticsEvent({
            eventType: 'publication_view',
            entityType: actualCollection,
            entityId: found.id,
            title: found.title,
          });
          const sameCol = await fetchPublishedCollection(actualCollection, 6);
          if (active) {
            setRelated(
              sameCol
                .filter((r) => r.id !== found.id)
                .slice(0, 3)
                .map((r) => normalizeToUnified(actualCollection, r))
            );
          }
        } else if (active) {
          setDocData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [collectionName, slug]);

  const { sanitizedHtml, headings } = useMemo(() => {
    if (!docData) return { sanitizedHtml: '', headings: [] };
    let combined = docData.content || '';
    if (collectionName === 'research_papers' && !combined) {
      const sections = [
        docData.introduction ? `<h2>Introduction</h2>${docData.introduction}` : '',
        docData.methodology ? `<h2>Research Methodology</h2>${docData.methodology}` : '',
        docData.analysis ? `<h2>Doctrinal Analysis</h2>${docData.analysis}` : '',
        docData.findings ? `<h2>Findings</h2>${docData.findings}` : '',
        docData.conclusion ? `<h2>Conclusion</h2>${docData.conclusion}` : '',
      ];
      combined = sections.filter(Boolean).join('');
    }
    const clean = sanitizeHtml(combined);
    const extracted = extractHeadingsAndInjectIds(clean);
    return { sanitizedHtml: extracted.html, headings: extracted.headings };
  }, [docData, collectionName]);

  const primaryFileUrl = docData?.pdfUrl || docData?.fileUrl || docData?.attachments?.[0]?.fileUrl || '';

  const handleTrackDownload = () => {
    if (!docData) return;
    trackAnalyticsEvent({
      eventType: 'file_download',
      entityType: collectionName,
      entityId: docData.id,
      title: docData.title,
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-12 w-3/4 bg-slate-200 rounded animate-pulse" />
        <div className="h-80 bg-white border border-slate-200 rounded-md animate-pulse" />
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold text-[#0F2342] mb-3">Publication Not Found</h1>
        <p className="text-sm text-slate-600 mb-6">
          This publication may have been unpublished or moved. Browse the complete archive to locate available materials.
        </p>
        <Link to="/archive" className="px-5 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md">
          Browse Publications Archive
        </Link>
      </div>
    );
  }

  const readMins = docData.readingTimeMinutes || estimateReadingTimeMinutes(sanitizedHtml || docData.abstract || '');

  return (
    <div>
      {/* Thin Reading Progress Bar */}
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-slate-200 z-30 no-print">
        <div
          className="h-full bg-[#164937] transition-transform duration-150 origin-left"
          style={{ transform: `scaleX(${readingProgress / 100})` }}
        />
      </div>

      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-6 no-print">
          <Link to="/" className="hover:text-[#0F2342]">Home</Link>
          <span>/</span>
          <Link to={meta.routeBase} className="hover:text-[#0F2342]">{meta.label}s</Link>
          <span>/</span>
          <span className="text-slate-700 truncate max-w-xs">{docData.title}</span>
        </nav>

        {/* Header Block */}
        <header className="pb-8 border-b border-slate-200 mb-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-3">
            <span className="font-semibold text-[#164937] uppercase tracking-wider">{meta.label}</span>
            <span aria-hidden="true">·</span>
            <span>{docData.categoryName || 'General Law'}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatDisplayDate(docData.publishedAt || docData.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{readMins} min read</span>
            {docData.isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#9E7B3B] font-semibold">Demonstration Sample Content</span>
              </>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0F2342] leading-[1.15] mb-4">
            {docData.title}
          </h1>

          {(docData.description || docData.abstract) && (
            <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mb-6">
              {docData.abstract || docData.description}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <Link to="/about" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <FallbackImage
                  src={profile.profileImageUrl || '/assets/aistudio/jameel-khan_2505a7a3.jpg'}
                  alt={docData.authorName || profile.fullName || 'Jameel Khan'}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="text-sm leading-tight">
                <span className="text-slate-500">By </span>
                <span className="font-semibold text-[#0F2342] group-hover:underline">
                  {docData.authorName || profile.fullName || 'Jameel Khan'}
                </span>
                {profile.headline && (
                  <span className="block text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {profile.headline}
                  </span>
                )}
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5 no-print">
              {primaryFileUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => setPdfModal({ open: true, url: primaryFileUrl, title: docData.title })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Document
                  </button>
                  <a
                    href={getDriveDownloadUrl(primaryFileUrl)}
                    download
                    target={isGoogleDriveUrl(primaryFileUrl) ? '_blank' : undefined}
                    rel={isGoogleDriveUrl(primaryFileUrl) ? 'noopener noreferrer' : undefined}
                    onClick={handleTrackDownload}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2342] bg-white border border-slate-300 rounded-md hover:border-[#0F2342]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>
        </header>

        {/* Main 70/30 Editorial Reading Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8">
            {docData.featuredImage && (
              <figure className="rounded-md overflow-hidden border border-slate-200 bg-slate-100">
                <FallbackImage
                  src={docData.featuredImage}
                  alt={docData.title}
                  title={docData.title}
                  className="w-full max-h-[420px] object-cover"
                />
              </figure>
            )}

            {/* Case Law / Judgment Structured Metadata Card */}
            {(collectionName === 'case_laws' || collectionName === 'judgments') && (
              <section className="bg-white border border-slate-200 rounded-md p-6">
                <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-4 pb-2 border-b border-slate-100">
                  Judicial &amp; Citation Particulars
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  {(docData.courtName || docData.court) && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Court</dt>
                      <dd className="font-medium text-[#0F2342] mt-0.5">{docData.courtName || docData.court}</dd>
                    </div>
                  )}
                  {docData.caseNumber && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Case Number</dt>
                      <dd className="font-mono text-slate-800 mt-0.5 tabular-nums">{docData.caseNumber}</dd>
                    </div>
                  )}
                  {docData.citation && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Citation</dt>
                      <dd className="font-mono text-[#164937] font-medium mt-0.5 tabular-nums">{docData.citation}</dd>
                    </div>
                  )}
                  {(docData.judgmentDate || docData.year) && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Year / Date</dt>
                      <dd className="font-mono text-slate-800 mt-0.5 tabular-nums">{docData.judgmentDate || docData.year}</dd>
                    </div>
                  )}
                  {docData.benchDetails && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Bench / Coram</dt>
                      <dd className="text-slate-700 mt-0.5">{docData.benchDetails}</dd>
                    </div>
                  )}
                  {(docData.subjectMatter || docData.subject) && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-wider text-slate-500">Subject Matter</dt>
                      <dd className="text-slate-700 mt-0.5">{docData.subjectMatter || docData.subject}</dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Case Law Specific Sections */}
            {collectionName === 'case_laws' && (
              <div className="space-y-6">
                {docData.headnotes && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Headnotes</h2>
                    <div className="legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.headnotes) }} />
                  </section>
                )}
                {docData.legalPrinciples && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Legal Principles</h2>
                    <div className="legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.legalPrinciples) }} />
                  </section>
                )}
                {Array.isArray(docData.statutoryProvisions) && docData.statutoryProvisions.length > 0 && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Relevant Statutory Provisions</h2>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-700">
                      {docData.statutoryProvisions.map((p: string, idx: number) => <li key={idx}>{p}</li>)}
                    </ul>
                  </section>
                )}
                {docData.observations && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Important Observations</h2>
                    <div className="legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.observations) }} />
                  </section>
                )}
              </div>
            )}

            {/* Judgment Specific Sections */}
            {collectionName === 'judgments' && (
              <div className="space-y-6">
                {docData.legalIssues && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Legal Issues</h2>
                    <div className="legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.legalIssues) }} />
                  </section>
                )}
                {docData.finalDecision && (
                  <section className="bg-white border border-slate-200 rounded-md p-6">
                    <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Operative Outcome / Decision</h2>
                    <div className="legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.finalDecision) }} />
                  </section>
                )}
              </div>
            )}

            {/* Main Prose Body */}
            {sanitizedHtml && (
              <div
                className="bg-white border border-slate-200 rounded-md p-6 sm:p-10 legal-prose"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            )}

            {/* Presentation File Details */}
            {collectionName === 'presentations' && (
              <section className="bg-white border border-slate-200 rounded-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-3">Presentation Deck Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 block">Topic</span>
                    <span className="font-medium text-slate-800">{docData.topic || docData.categoryName}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 block">File Format</span>
                    <span className="font-mono text-slate-800">{docData.fileType || 'PPTX / PDF'}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500 block">File Size</span>
                    <span className="font-mono tabular-nums text-slate-800">{formatBytes(docData.fileSizeBytes)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Footnotes, References & Bibliography */}
            {(docData.footnotes || docData.references || docData.bibliography) && (
              <section className="bg-[#F4F0E8] border border-slate-200 rounded-md p-6 sm:p-8 space-y-6">
                {docData.footnotes && (
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-2">Footnotes</h2>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{docData.footnotes}</div>
                  </div>
                )}
                {(docData.references || docData.bibliography) && (
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-2">References &amp; Bibliography</h2>
                    <div
                      className="text-sm text-slate-700 leading-relaxed legal-prose"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(docData.bibliography || docData.references) }}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Share Row */}
            <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <ShareButtons title={docData.title} />
              <Link
                to={meta.routeBase}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F2342] hover:underline no-print"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to {meta.label}s
              </Link>
            </div>
          </div>

          {/* Right Rail: Sticky Table of Contents, Attachments & Keywords */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 no-print">
            {headings.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-md p-6">
                <h2 className="font-serif text-lg font-bold text-[#0F2342] mb-3 pb-2 border-b border-slate-100">
                  Table of Contents
                </h2>
                <ul className="space-y-2 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? 'pl-4 text-xs' : ''}>
                      <a
                        href={`#${h.id}`}
                        className="text-slate-600 hover:text-[#0F2342] transition-colors block leading-snug"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(primaryFileUrl || (Array.isArray(docData.attachments) && docData.attachments.length > 0) || docData.externalSourceUrl) && (
              <div className="bg-white border border-slate-200 rounded-md p-6 space-y-3">
                <h2 className="font-serif text-lg font-bold text-[#0F2342] mb-2">
                  Documents &amp; Attachments
                </h2>
                {primaryFileUrl && (
                  <div className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-md flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#0F2342] truncate">
                        {docData.fileName || 'Primary Publication Document'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {docData.fileType || 'PDF'} {docData.fileSizeBytes ? `· ${formatBytes(docData.fileSizeBytes)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPdfModal({ open: true, url: primaryFileUrl, title: docData.title })}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2342] rounded-md shrink-0 cursor-pointer"
                    >
                      Open
                    </button>
                  </div>
                )}
                {Array.isArray(docData.attachments) &&
                  docData.attachments.map((att: any) => (
                    <div key={att.id} className="p-3 bg-[#FBF9F5] border border-slate-200 rounded-md flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#164937] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#0F2342] truncate">{att.fileName}</p>
                          <p className="text-[11px] font-mono text-slate-500">{formatBytes(att.fileSizeBytes)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPdfModal({ open: true, url: att.fileUrl, title: att.fileName })}
                        className="px-2.5 py-1 text-xs font-medium text-[#0F2342] border border-slate-300 rounded hover:border-[#0F2342] cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  ))}
                {docData.externalSourceUrl && (
                  <a
                    href={docData.externalSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#164937] hover:underline"
                  >
                    External Reference Source <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {Array.isArray(docData.tags) && docData.tags.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-md p-6">
                <h2 className="font-serif text-lg font-bold text-[#0F2342] mb-2">Index Keywords</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {docData.tags.join(' · ')}
                </p>
              </div>
            )}
          </aside>
        </div>

        {/* Related Publications */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-slate-200 no-print">
            <h2 className="font-serif text-2xl font-bold text-[#0F2342] mb-6">
              Related Publications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((item) => <PublicationCard key={item.id} item={item} />)}
            </div>
          </section>
        )}
      </article>

      <PdfViewerModal
        isOpen={pdfModal.open}
        onClose={() => setPdfModal({ open: false, url: '', title: '' })}
        title={pdfModal.title}
        pdfUrl={pdfModal.url}
        onDownload={handleTrackDownload}
      />
    </div>
  );
};
