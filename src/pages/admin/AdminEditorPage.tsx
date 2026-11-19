import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Eye, History, RotateCcw, Save, Send, X } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  COLLECTION_META,
  fetchDocumentByIdAdmin,
  fetchRevisionsAdmin,
  restoreRevisionAdmin,
  savePublicationAdmin,
  updatePublicationStatusAdmin,
} from '../../services/firestoreService';
import type { ContentCollection, ContentRevision, PublicationStatus, ResourceKind } from '../../types/portal';
import { estimateReadingTimeMinutes, formatDisplayDate, generateSlug, sanitizeHtml } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';
import { RichTextEditor } from '../../editor/RichTextEditor';
import { FileUploadField } from '../../components/admin/FileUploadField';

const COLLECTION_OPTIONS: Array<{ value: ContentCollection; label: string }> = [
  { value: 'articles', label: 'Legal Article' },
  { value: 'research_papers', label: 'Research Paper' },
  { value: 'case_laws', label: 'Case Law Digest' },
  { value: 'judgments', label: 'Judgment' },
  { value: 'presentations', label: 'Presentation' },
  { value: 'lectures', label: 'Lecture Notes' },
  { value: 'resources', label: 'Educational Resource' },
];

export const AdminEditorPage: React.FC = () => {
  const { collectionParam, idParam } = useParams<{ collectionParam?: string; idParam?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { categories } = usePortal();

  const initialCol =
    (collectionParam as ContentCollection) ||
    (searchParams.get('type') as ContentCollection) ||
    'articles';

  const [collectionName, setCollectionName] = useState<ContentCollection>(initialCol);
  const [docId, setDocId] = useState<string | null>(idParam || null);
  const [status, setStatus] = useState<PublicationStatus>('draft');

  // Common fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_constitutional_law');
  const [tagsText, setTagsText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [authorName, setAuthorName] = useState('Jameel Khan');
  const [featuredImage, setFeaturedImage] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  // Article specific
  const [footnotes, setFootnotes] = useState('');
  const [references, setReferences] = useState('');

  // Research Paper specific
  const [abstract, setAbstract] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [methodology, setMethodology] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [findings, setFindings] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [bibliography, setBibliography] = useState('');

  // Case Law & Judgment specific
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [citation, setCitation] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [benchDetails, setBenchDetails] = useState('');
  const [subjectMatter, setSubjectMatter] = useState('');
  const [legalPrinciples, setLegalPrinciples] = useState('');
  const [statutoryProvisionsText, setStatutoryProvisionsText] = useState('');
  const [headnotes, setHeadnotes] = useState('');
  const [observations, setObservations] = useState('');
  const [externalSourceUrl, setExternalSourceUrl] = useState('');
  const [judgmentDate, setJudgmentDate] = useState('');
  const [legalIssues, setLegalIssues] = useState('');
  const [finalDecision, setFinalDecision] = useState('');

  // Presentation & Resource files
  const [topic, setTopic] = useState('');
  const [resourceKind, setResourceKind] = useState<ResourceKind>('lecture_notes');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);

  // Editor state & auto-save
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedText, setLastSavedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [recoveryNotice, setRecoveryNotice] = useState(false);

  const recoveryKey = `jk_cms_autosave_${collectionName}_${docId || 'new'}`;

  usePageSeo({
    title: `${docId ? 'Edit' : 'Create'} ${COLLECTION_META[collectionName].label} | Admin CMS`,
    description: 'Publishing editor for Jameel Khan Legal Research & Publications.',
    canonicalPath: '/admin/editor',
  });

  // Load existing document if editing
  useEffect(() => {
    if (!idParam || !collectionParam) return;
    const col = collectionParam as ContentCollection;
    setCollectionName(col);
    setDocId(idParam);

    fetchDocumentByIdAdmin(col, idParam).then((d) => {
      if (!d) return;
      setTitle(d.title || '');
      setSlug(d.slug || '');
      setSlugTouched(true);
      setDescription(d.description || '');
      setContent(d.content || '');
      setCategoryId(d.categoryId || categories[0]?.id || 'cat_constitutional_law');
      setTagsText(Array.isArray(d.tags) ? d.tags.join(', ') : '');
      setKeywordsText(Array.isArray(d.keywords) ? d.keywords.join(', ') : '');
      setAuthorName(d.authorName || 'Jameel Khan');
      setFeaturedImage(d.featuredImage || '');
      setIsFeatured(Boolean(d.isFeatured));
      setStatus(d.status || 'draft');
      setSeoTitle(d.seoTitle || '');
      setSeoDescription(d.seoDescription || '');
      setFootnotes(d.footnotes || '');
      setReferences(d.references || '');
      setAbstract(d.abstract || '');
      setIntroduction(d.introduction || '');
      setMethodology(d.methodology || '');
      setAnalysis(d.analysis || '');
      setFindings(d.findings || '');
      setConclusion(d.conclusion || '');
      setBibliography(d.bibliography || '');
      setCaseNumber(d.caseNumber || '');
      setCourtName(d.courtName || d.court || '');
      setCitation(d.citation || '');
      setYear(d.year || new Date().getFullYear());
      setBenchDetails(d.benchDetails || '');
      setSubjectMatter(d.subjectMatter || d.subject || '');
      setLegalPrinciples(d.legalPrinciples || '');
      setStatutoryProvisionsText(Array.isArray(d.statutoryProvisions) ? d.statutoryProvisions.join('\n') : '');
      setHeadnotes(d.headnotes || '');
      setObservations(d.observations || '');
      setExternalSourceUrl(d.externalSourceUrl || '');
      setJudgmentDate(d.judgmentDate || '');
      setLegalIssues(d.legalIssues || '');
      setFinalDecision(d.finalDecision || '');
      setTopic(d.topic || '');
      setResourceKind(d.resourceKind || 'lecture_notes');
      setFileUrl(d.pdfUrl || d.fileUrl || '');
      setFileName(d.fileName || '');
      setFileType(d.fileType || '');
      setFileSizeBytes(d.fileSizeBytes || 0);
    });

    fetchRevisionsAdmin(col, idParam).then(setRevisions);
  }, [idParam, collectionParam, categories]);

  // Check unexpected browser close draft recovery
  useEffect(() => {
    try {
      const saved = localStorage.getItem(recoveryKey);
      if (saved && !idParam) {
        const parsed = JSON.parse(saved);
        if (parsed.title || parsed.content) setRecoveryNotice(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [recoveryKey, idParam]);

  const buildPayload = useCallback((): Record<string, any> => {
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const parseCsv = (txt: string) =>
      txt
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);

    const common: Record<string, any> = {
      title: title.trim(),
      slug: generateSlug(slug || title),
      description: description.trim() || abstract.trim().slice(0, 500),
      content,
      categoryId,
      categoryName: selectedCategory?.name || 'General Law',
      tags: parseCsv(tagsText),
      keywords: parseCsv(keywordsText),
      featuredImage: featuredImage.trim(),
      authorName: authorName.trim() || 'Jameel Khan',
      isFeatured,
      seoTitle: (seoTitle || title).trim().slice(0, 160),
      seoDescription: (seoDescription || description || abstract).trim().slice(0, 320),
    };

    if (collectionName === 'articles') {
      return {
        ...common,
        footnotes,
        references,
        readingTimeMinutes: estimateReadingTimeMinutes(content),
      };
    }
    if (collectionName === 'research_papers') {
      return {
        ...common,
        abstract: abstract.trim() || description.trim(),
        introduction,
        methodology,
        analysis,
        findings,
        conclusion,
        bibliography,
        pdfUrl: fileUrl.trim(),
      };
    }
    if (collectionName === 'case_laws') {
      return {
        ...common,
        caseNumber: caseNumber.trim(),
        courtName: courtName.trim(),
        citation: citation.trim(),
        year: Number(year) || new Date().getFullYear(),
        benchDetails: benchDetails.trim(),
        subjectMatter: subjectMatter.trim(),
        legalPrinciples,
        statutoryProvisions: statutoryProvisionsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30),
        headnotes,
        observations,
        pdfUrl: fileUrl.trim(),
        externalSourceUrl: externalSourceUrl.trim(),
      };
    }
    if (collectionName === 'judgments') {
      return {
        ...common,
        caseNumber: caseNumber.trim(),
        court: courtName.trim(),
        judgmentDate: judgmentDate.trim(),
        year: Number(year) || new Date().getFullYear(),
        citation: citation.trim(),
        subject: subjectMatter.trim(),
        legalIssues,
        finalDecision,
        pdfUrl: fileUrl.trim(),
      };
    }
    if (collectionName === 'presentations') {
      return {
        ...common,
        topic: topic.trim(),
        fileUrl: fileUrl.trim(),
        fileName: fileName.trim(),
        fileType: fileType.trim(),
        fileSizeBytes: Number(fileSizeBytes || 0),
      };
    }
    return {
      ...common,
      resourceKind,
      fileUrl: fileUrl.trim(),
      fileName: fileName.trim(),
      fileType: fileType.trim(),
      fileSizeBytes: Number(fileSizeBytes || 0),
    };
  }, [
    categories, categoryId, title, slug, description, abstract, content, tagsText, keywordsText,
    featuredImage, authorName, isFeatured, seoTitle, seoDescription, collectionName, footnotes,
    references, introduction, methodology, analysis, findings, conclusion, bibliography, fileUrl,
    caseNumber, courtName, citation, year, benchDetails, subjectMatter, legalPrinciples,
    statutoryProvisionsText, headnotes, observations, externalSourceUrl, judgmentDate,
    legalIssues, finalDecision, topic, fileName, fileType, fileSizeBytes, resourceKind,
  ]);

  const saveLocalSnapshot = useCallback(() => {
    try {
      localStorage.setItem(
        recoveryKey,
        JSON.stringify({
          title, slug, description, content, abstract, footnotes, references,
          courtName, citation, caseNumber, savedAt: new Date().toISOString(),
        })
      );
      setLastSavedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSavingState('saved');
    } catch {
      // Ignore quota
    }
  }, [recoveryKey, title, slug, description, content, abstract, footnotes, references, courtName, citation, caseNumber]);

  // Periodic Auto-Save every 15s (to local recovery + Firestore if existing draft)
  useEffect(() => {
    if (!title.trim() && !content.trim()) return;
    const timer = window.setInterval(async () => {
      saveLocalSnapshot();
      if (docId && status === 'draft' && title.trim().length >= 2) {
        try {
          setSavingState('saving');
          await savePublicationAdmin(collectionName, docId, buildPayload(), 'draft');
          setSavingState('saved');
          setLastSavedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } catch {
          // Keep silent on background auto-save
        }
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [title, content, docId, status, collectionName, buildPayload, saveLocalSnapshot]);

  const restoreRecoveryDraft = () => {
    try {
      const raw = localStorage.getItem(recoveryKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title) setTitle(d.title);
      if (d.slug) setSlug(d.slug);
      if (d.description) setDescription(d.description);
      if (d.content) setContent(d.content);
      if (d.abstract) setAbstract(d.abstract);
      if (d.footnotes) setFootnotes(d.footnotes);
      if (d.references) setReferences(d.references);
      if (d.courtName) setCourtName(d.courtName);
      if (d.citation) setCitation(d.citation);
      if (d.caseNumber) setCaseNumber(d.caseNumber);
      setRecoveryNotice(false);
    } catch {
      setRecoveryNotice(false);
    }
  };

  const validateBeforeSave = (targetStatus: PublicationStatus): string | null => {
    if (title.trim().length < 2) return 'Please enter a title (minimum 2 characters).';
    if (!categoryId) return 'Please select a category.';
    if (collectionName === 'research_papers' && targetStatus === 'published' && !abstract.trim() && !description.trim()) {
      return 'Research papers require an Abstract before publishing.';
    }
    if ((collectionName === 'case_laws' || collectionName === 'judgments') && courtName.trim().length < 2) {
      return 'Please enter the Court name.';
    }
    if (targetStatus === 'scheduled' && !scheduledDate) {
      return 'Please choose a scheduled publication date and time.';
    }
    return null;
  };

  const handleSave = async (targetStatus: PublicationStatus) => {
    setErrorMsg('');
    const err = validateBeforeSave(targetStatus);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setSavingState('saving');
    try {
      const payload = buildPayload();
      if (targetStatus === 'scheduled' && scheduledDate) {
        payload.scheduledAt = new Date(scheduledDate).toISOString();
      }
      const savedId = await savePublicationAdmin(collectionName, docId, payload, targetStatus);
      setDocId(savedId);
      setStatus(targetStatus);
      setSavingState('saved');
      setLastSavedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      localStorage.removeItem(recoveryKey);
      setRecoveryNotice(false);
      if (!idParam) {
        navigate(`/admin/editor/${collectionName}/${savedId}`, { replace: true });
      } else {
        fetchRevisionsAdmin(collectionName, savedId).then(setRevisions);
      }
    } catch (e) {
      setSavingState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save publication.');
    }
  };

  const handleUnpublish = async () => {
    if (!docId) return;
    setSavingState('saving');
    try {
      await updatePublicationStatusAdmin(collectionName, docId, 'unpublished');
      setStatus('unpublished');
      setSavingState('saved');
    } catch (e) {
      setSavingState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Could not unpublish.');
    }
  };

  const handleRestoreRevision = async (rev: ContentRevision) => {
    if (!window.confirm(`Restore revision saved on ${formatDisplayDate(rev.createdAt)}?`)) return;
    await restoreRevisionAdmin(rev);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#0F2342]">
            {docId ? `Edit ${COLLECTION_META[collectionName].label}` : `Publish ${COLLECTION_META[collectionName].label}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
            <span>Status: <strong className="text-[#0F2342] uppercase">{status}</strong></span>
            {savingState === 'saving' && <span>· Saving...</span>}
            {savingState === 'saved' && lastSavedText && (
              <span className="text-[#164937] inline-flex items-center gap-1">
                · <CheckCircle2 className="w-3.5 h-3.5" /> Saved at {lastSavedText}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>

          {status === 'published' && (
            <button
              type="button"
              onClick={handleUnpublish}
              className="px-3.5 py-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-md cursor-pointer"
            >
              Unpublish
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#164937] rounded-md hover:bg-[#103628] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {status === 'published' ? 'Update Published Content' : 'Publish Now'}
          </button>
        </div>
      </div>

      {recoveryNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950">
          <span>An unsaved draft from an unexpected browser closure was detected for this workspace.</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={restoreRecoveryDraft} className="px-3 py-1.5 bg-[#0F2342] text-white rounded font-medium cursor-pointer">
              Restore Draft
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(recoveryKey);
                setRecoveryNotice(false);
              }}
              className="px-3 py-1.5 border border-amber-300 rounded cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Main Publishing Canvas */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5">
            {!docId && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Content Module</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLLECTION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCollectionName(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                        collectionName === opt.value
                          ? 'bg-[#0F2342] text-white border-[#0F2342]'
                          : 'bg-[#FBF9F5] text-slate-700 border-slate-200 hover:border-[#0F2342]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="pub-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-600">*</span>
              </label>
              <input
                id="pub-title"
                type="text"
                maxLength={260}
                value={title}
                onChange={(e) => {
                  const v = e.target.value;
                  setTitle(v);
                  if (!slugTouched) setSlug(generateSlug(v));
                }}
                onBlur={saveLocalSnapshot}
                placeholder="Enter publication title..."
                className="w-full px-3.5 py-2.5 text-base font-medium border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pub-slug" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  URL Slug (SEO Friendly)
                </label>
                <input
                  id="pub-slug"
                  type="text"
                  maxLength={200}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                  }}
                  placeholder="auto-generated-from-title"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                />
              </div>

              <div>
                <label htmlFor="pub-author" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Author Name
                </label>
                <input
                  id="pub-author"
                  type="text"
                  maxLength={120}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pub-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Short Description / Summary
              </label>
              <textarea
                id="pub-desc"
                rows={3}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveLocalSnapshot}
                placeholder="Concise academic summary displayed in library listings and search results..."
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
              />
            </div>
          </div>

          {/* Specialized Fields per Collection */}
          {collectionName === 'research_papers' && (
            <div className="bg-white border border-slate-200 rounded-md p-6 space-y-5">
              <h2 className="font-serif text-xl font-bold text-[#0F2342]">Research Paper Structure</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Abstract *</label>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Introduction</label>
                  <textarea rows={4} value={introduction} onChange={(e) => setIntroduction(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Research Methodology</label>
                  <textarea rows={4} value={methodology} onChange={(e) => setMethodology(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Analysis</label>
                  <textarea rows={4} value={analysis} onChange={(e) => setAnalysis(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Findings</label>
                  <textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Conclusion</label>
                  <textarea rows={4} value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bibliography &amp; References</label>
                  <textarea rows={4} value={bibliography} onChange={(e) => setBibliography(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
              </div>
            </div>
          )}

          {(collectionName === 'case_laws' || collectionName === 'judgments') && (
            <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#0F2342]">
                {collectionName === 'case_laws' ? 'Case Law Metadata & Headnotes' : 'Judgment Particulars'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Court Name *</label>
                  <input type="text" value={courtName} onChange={(e) => setCourtName(e.target.value)} placeholder="e.g., Supreme Court" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Case Number</label>
                  <input type="text" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Case Citation</label>
                  <input type="text" value={citation} onChange={(e) => setCitation(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relevant Year</label>
                  <input type="number" min={1800} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
              </div>

              {collectionName === 'case_laws' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bench / Judge Details (Optional)</label>
                      <input type="text" value={benchDetails} onChange={(e) => setBenchDetails(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Subject Matter</label>
                      <input type="text" value={subjectMatter} onChange={(e) => setSubjectMatter(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Statutory Provisions (one per line)</label>
                    <textarea rows={3} value={statutoryProvisionsText} onChange={(e) => setStatutoryProvisionsText(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Headnotes</label>
                    <textarea rows={3} value={headnotes} onChange={(e) => setHeadnotes(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Principles</label>
                    <textarea rows={3} value={legalPrinciples} onChange={(e) => setLegalPrinciples(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Important Observations</label>
                    <textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">External Source Link</label>
                    <input type="url" value={externalSourceUrl} onChange={(e) => setExternalSourceUrl(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Judgment Date</label>
                      <input type="date" value={judgmentDate} onChange={(e) => setJudgmentDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                      <input type="text" value={subjectMatter} onChange={(e) => setSubjectMatter(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Issues</label>
                    <textarea rows={3} value={legalIssues} onChange={(e) => setLegalIssues(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Final Decision / Operative Outcome</label>
                    <textarea rows={3} value={finalDecision} onChange={(e) => setFinalDecision(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                  </div>
                </>
              )}
            </div>
          )}

          {(collectionName === 'presentations' || collectionName === 'lectures' || collectionName === 'resources') && (
            <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
              <h2 className="font-serif text-xl font-bold text-[#0F2342]">Resource Metadata</h2>
              {collectionName === 'presentations' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Presentation Topic</label>
                  <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Resource Classification</label>
                  <select value={resourceKind} onChange={(e) => setResourceKind(e.target.value as ResourceKind)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
                    <option value="lecture_notes">Lecture Notes</option>
                    <option value="training_material">Training Material</option>
                    <option value="seminar_paper">Seminar Paper</option>
                    <option value="workshop_resource">Workshop Resource</option>
                    <option value="legal_guideline">Legal Guideline</option>
                    <option value="academic_handout">Academic Handout</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Rich Text Body Editor */}
          <div className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#0F2342]">
              Main Content (Rich Text Editor)
            </h2>
            <RichTextEditor
              value={content}
              onChange={setContent}
              onBlurSave={() => saveLocalSnapshot()}
            />

            {collectionName === 'articles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Footnotes</label>
                  <textarea rows={4} value={footnotes} onChange={(e) => setFootnotes(e.target.value)} placeholder="1. Citation..." className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">References</label>
                  <textarea rows={4} value={references} onChange={(e) => setReferences(e.target.value)} placeholder="Bibliography..." className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Taxonomy, Files, Schedule, SEO, Revisions */}
        <aside className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-4">
            <h2 className="font-serif text-lg font-bold text-[#0F2342]">Taxonomy &amp; Visibility</h2>
            <div>
              <label htmlFor="pub-cat" className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                id="pub-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma separated)</label>
              <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Constitutional Law, Natural Justice" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Search Keywords (comma separated)</label>
              <input type="text" value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} placeholder="judicial review, due process" className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#0F2342]"
              />
              Feature on Homepage
            </label>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-5">
            <h2 className="font-serif text-lg font-bold text-[#0F2342]">Media &amp; Documents</h2>
            <FileUploadField
              label="Featured Cover Image (JPG, PNG, WebP)"
              accept=".jpg,.jpeg,.png,.webp"
              visibility={status === 'published' ? 'public' : 'private'}
              valueUrl={featuredImage}
              onUploaded={(info) => setFeaturedImage(info.url)}
              onClear={() => setFeaturedImage('')}
            />

            <FileUploadField
              label="Primary Publication Document (PDF, PPT, PPTX, DOC, DOCX)"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              visibility={status === 'published' ? 'public' : 'private'}
              valueUrl={fileUrl}
              fileName={fileName}
              fileSizeBytes={fileSizeBytes}
              fileType={fileType}
              onUploaded={(info) => {
                setFileUrl(info.url);
                setFileName(info.fileName);
                setFileSizeBytes(info.fileSizeBytes);
                setFileType(info.fileType);
              }}
              onClear={() => {
                setFileUrl('');
                setFileName('');
                setFileSizeBytes(0);
                setFileType('');
              }}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#0F2342] flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Schedule Publication
            </h2>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
            />
            <button
              type="button"
              onClick={() => handleSave('scheduled')}
              className="w-full py-2 text-xs font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer"
            >
              Schedule Publication
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
            <h2 className="font-serif text-lg font-bold text-[#0F2342]">SEO Metadata</h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Title</label>
              <input type="text" maxLength={160} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SEO Meta Description</label>
              <textarea rows={3} maxLength={320} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md" />
            </div>
          </div>

          {revisions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
              <h2 className="font-serif text-lg font-bold text-[#0F2342] flex items-center gap-2">
                <History className="w-4 h-4" /> Revision History
              </h2>
              <ul className="space-y-2 max-h-48 overflow-y-auto text-xs">
                {revisions.map((rev) => (
                  <li key={rev.id} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="truncate text-slate-600">{formatDisplayDate(rev.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => handleRestoreRevision(rev)}
                      className="inline-flex items-center gap-1 text-[#0F2342] font-medium hover:underline cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Live Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-[#FBF9F5] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-[#164937]">Publication Preview</span>
              <button type="button" onClick={() => setPreviewOpen(false)} className="p-1.5 text-slate-600 hover:text-red-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <h1 className="font-serif text-4xl font-bold text-[#0F2342]">{title || 'Untitled Publication'}</h1>
              {(abstract || description) && <p className="text-lg text-slate-600">{abstract || description}</p>}
              <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8 legal-prose" dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
