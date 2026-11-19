import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  type ActivityLog,
  type AnalyticsEvent,
  type AuthorProfile,
  type Category,
  type ContactMessage,
  type ContentCollection,
  type ContentRevision,
  type MediaAsset,
  type PublicationStatus,
  type SiteSettings,
  type SubscriberRecord,
  type UnifiedPublication,
} from '../types/portal';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PROFILE_DATA,
  DEFAULT_SITE_SETTINGS,
  DEMO_ARTICLES,
  DEMO_CASE_LAWS,
  DEMO_JUDGMENTS,
  DEMO_LECTURES,
  DEMO_PRESENTATIONS,
  DEMO_RESEARCH_PAPERS,
  DEMO_RESOURCES,
} from '../data/seedData';
import { generateSafeId, generateSlug, stripHtml, toMillis } from '../utils/formatters';

export const COLLECTION_META: Record<ContentCollection, { label: string; routeBase: string }> = {
  articles: { label: 'Legal Article', routeBase: '/articles' },
  research_papers: { label: 'Research Paper', routeBase: '/research' },
  case_laws: { label: 'Case Law', routeBase: '/case-laws' },
  judgments: { label: 'Judgment', routeBase: '/judgments' },
  presentations: { label: 'Presentation', routeBase: '/presentations' },
  lectures: { label: 'Lecture Notes', routeBase: '/resources' },
  resources: { label: 'Educational Resource', routeBase: '/resources' },
};

export function normalizeToUnified(col: ContentCollection, raw: any): UnifiedPublication {
  const meta = COLLECTION_META[col];
  return {
    id: raw.id,
    collection: col,
    typeLabel: meta.label,
    routeBase: meta.routeBase,
    title: raw.title || 'Untitled',
    slug: raw.slug || raw.id,
    description: raw.description || raw.abstract || stripHtml(raw.content || '').slice(0, 220),
    categoryId: raw.categoryId || 'cat_miscellaneous',
    categoryName: raw.categoryName || 'General Law',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    featuredImage: raw.featuredImage || '',
    authorName: raw.authorName || 'Jameel Khan',
    status: raw.status || 'draft',
    isFeatured: Boolean(raw.isFeatured),
    isDemo: Boolean(raw.isDemo),
    citation: raw.citation,
    caseNumber: raw.caseNumber,
    court: raw.court || raw.courtName,
    year: raw.year,
    viewCount: Number(raw.viewCount || 0),
    downloadCount: Number(raw.downloadCount || 0),
    publishedAtMs: toMillis(raw.publishedAt || raw.createdAt),
    updatedAtMs: toMillis(raw.updatedAt || raw.createdAt),
    raw,
  };
}

// ---------------------------------------------------------------------------
// Global Config Fetchers (Public Read)
// ---------------------------------------------------------------------------
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'site_settings', 'global'));
    if (!snap.exists()) return null;
    return snap.data() as SiteSettings;
  } catch (err) {
    console.warn('Settings fallback active:', err);
    return null;
  }
}

export async function fetchPublicProfile(): Promise<AuthorProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles', 'main_profile'));
    if (!snap.exists()) return null;
    return snap.data() as AuthorProfile;
  } catch (err) {
    console.warn('Profile fallback active:', err);
    return null;
  }
}

export async function fetchActiveCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, 'categories'), where('isActive', '==', true), limit(50));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => d.data() as Category);
    return items.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  } catch (err) {
    console.warn('Categories fallback active:', err);
    return [];
  }
}

export async function fetchAllCategoriesAdmin(): Promise<Category[]> {
  try {
    const snap = await getDocs(query(collection(db, 'categories'), limit(100)));
    return snap.docs
      .map((d) => d.data() as Category)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'categories');
  }
}

// ---------------------------------------------------------------------------
// Public Content Queries (Always enforces status == 'published')
// ---------------------------------------------------------------------------
export async function fetchPublishedCollection(col: ContentCollection, maxItems = 50): Promise<any[]> {
  try {
    const q = query(
      collection(db, col),
      where('status', '==', 'published'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, col);
  }
}

export async function fetchPublishedBySlugOrId(col: ContentCollection, slugOrId: string): Promise<any | null> {
  try {
    // Try direct ID lookup first if valid ID format
    if (/^[a-zA-Z0-9_-]+$/.test(slugOrId)) {
      try {
        const directSnap = await getDoc(doc(db, col, slugOrId));
        if (directSnap.exists() && directSnap.data().status === 'published') {
          return directSnap.data();
        }
      } catch {
        // Might fail if doc is not published (security rules deny draft get for public) — fall through to slug query
      }
    }

    const q = query(
      collection(db, col),
      where('status', '==', 'published'),
      where('slug', '==', slugOrId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].data();
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${col}/${slugOrId}`);
  }
}

export async function fetchAllPublishedUnified(maxPerCollection = 30): Promise<UnifiedPublication[]> {
  const cols: ContentCollection[] = [
    'articles',
    'research_papers',
    'case_laws',
    'judgments',
    'presentations',
    'lectures',
    'resources',
  ];
  const results = await Promise.all(
    cols.map(async (col) => {
      try {
        const items = await fetchPublishedCollection(col, maxPerCollection);
        return items.map((item) => normalizeToUnified(col, item));
      } catch {
        return [] as UnifiedPublication[];
      }
    })
  );
  return results.flat().sort((a, b) => b.publishedAtMs - a.publishedAtMs);
}

// ---------------------------------------------------------------------------
// Search Engine Across All Published Collections
// ---------------------------------------------------------------------------
export interface SearchFilters {
  queryText?: string;
  contentType?: ContentCollection | 'all';
  categoryId?: string;
  year?: string;
  sortBy?: 'relevance' | 'latest';
}

export async function searchAllPublications(filters: SearchFilters): Promise<UnifiedPublication[]> {
  const cols: ContentCollection[] =
    filters.contentType && filters.contentType !== 'all'
      ? [filters.contentType]
      : ['articles', 'research_papers', 'case_laws', 'judgments', 'presentations', 'lectures', 'resources'];

  const allItems = (
    await Promise.all(
      cols.map(async (col) => {
        try {
          const rows = await fetchPublishedCollection(col, 80);
          return rows.map((r) => normalizeToUnified(col, r));
        } catch {
          return [] as UnifiedPublication[];
        }
      })
    )
  ).flat();

  const qLower = (filters.queryText || '').trim().toLowerCase();
  const terms = qLower ? qLower.split(/\s+/).filter(Boolean) : [];

  const scored = allItems
    .filter((item) => {
      if (filters.categoryId && filters.categoryId !== 'all' && item.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.year && filters.year !== 'all') {
        const itemYear = item.year || (item.publishedAtMs ? new Date(item.publishedAtMs).getFullYear() : 0);
        if (String(itemYear) !== String(filters.year)) return false;
      }
      return true;
    })
    .map((item) => {
      if (terms.length === 0) return { item, score: 1 };
      const title = item.title.toLowerCase();
      const desc = item.description.toLowerCase();
      const cat = item.categoryName.toLowerCase();
      const tags = item.tags.join(' ').toLowerCase();
      const kw = item.keywords.join(' ').toLowerCase();
      const citation = (item.citation || '').toLowerCase();
      const caseNum = (item.caseNumber || '').toLowerCase();
      const court = (item.court || '').toLowerCase();
      const yr = String(item.year || '');
      const fullText = `${title} ${desc} ${cat} ${tags} ${kw} ${citation} ${caseNum} ${court} ${yr}`;

      let score = 0;
      for (const term of terms) {
        if (!fullText.includes(term)) return { item, score: 0 };
        if (title.includes(term)) score += 10;
        if (citation.includes(term) || caseNum.includes(term)) score += 9;
        if (court.includes(term) || kw.includes(term)) score += 6;
        if (tags.includes(term) || cat.includes(term)) score += 5;
        if (desc.includes(term)) score += 3;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0);

  if (filters.sortBy === 'latest' || terms.length === 0) {
    return scored.sort((a, b) => b.item.publishedAtMs - a.item.publishedAtMs).map((s) => s.item);
  }
  return scored
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : b.item.publishedAtMs - a.item.publishedAtMs))
    .map((s) => s.item);
}

// ---------------------------------------------------------------------------
// Public Visitor Submissions (Newsletter, Contact, Analytics)
// ---------------------------------------------------------------------------
export async function subscribeNewsletter(email: string): Promise<void> {
  const id = generateSafeId('sub');
  try {
    await setDoc(doc(db, 'subscribers', id), {
      id,
      email: email.trim().toLowerCase(),
      status: 'active',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `subscribers/${id}`);
  }
}

export async function submitContactMessage(payload: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<void> {
  const id = generateSafeId('msg');
  try {
    await setDoc(doc(db, 'contact_messages', id), {
      id,
      senderName: payload.senderName.trim().slice(0, 120),
      senderEmail: payload.senderEmail.trim().slice(0, 200),
      subject: payload.subject.trim().slice(0, 200),
      message: payload.message.trim().slice(0, 5000),
      status: 'unread',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contact_messages/${id}`);
  }
}

export async function trackAnalyticsEvent(event: {
  eventType: 'page_view' | 'publication_view' | 'file_download' | 'search_query';
  entityType?: string;
  entityId?: string;
  title?: string;
  searchTerm?: string;
}): Promise<void> {
  const id = generateSafeId('evt');
  try {
    await setDoc(doc(db, 'analytics', id), {
      id,
      eventType: event.eventType,
      ...(event.entityType ? { entityType: event.entityType.slice(0, 60) } : {}),
      ...(event.entityId ? { entityId: event.entityId.slice(0, 128) } : {}),
      ...(event.title ? { title: event.title.slice(0, 260) } : {}),
      ...(event.searchTerm ? { searchTerm: event.searchTerm.slice(0, 160) } : {}),
      referrer: typeof document !== 'undefined' ? (document.referrer || 'direct').slice(0, 300) : 'direct',
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking telemetry
  }
}

// ---------------------------------------------------------------------------
// Admin Content Management & Publishing Operations
// ---------------------------------------------------------------------------
export async function logAdminActivity(
  action: string,
  summary: string,
  targetCollection?: string,
  targetId?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const id = generateSafeId('log');
  try {
    await setDoc(doc(db, 'activity_logs', id), {
      id,
      actorUid: user.uid,
      actorEmail: user.email || '',
      action: action.slice(0, 120),
      ...(targetCollection ? { targetCollection: targetCollection.slice(0, 80) } : {}),
      ...(targetId ? { targetId: targetId.slice(0, 128) } : {}),
      summary: summary.slice(0, 500),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Activity log write failed:', err);
  }
}

export async function fetchCollectionAdmin(col: ContentCollection, maxItems = 200): Promise<any[]> {
  try {
    const snap = await getDocs(query(collection(db, col), limit(maxItems)));
    return snap.docs
      .map((d) => d.data())
      .sort((a, b) => toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, col);
  }
}

export async function fetchDocumentByIdAdmin(col: ContentCollection, id: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, col, id));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${col}/${id}`);
  }
}

function cleanFirestorePayload(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) cleaned[k] = v;
  }
  return cleaned;
}

export async function savePublicationAdmin(
  col: ContentCollection,
  id: string | null,
  rawPayload: Record<string, any>,
  status: PublicationStatus
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator authentication required.');

  const docId = id && /^[a-zA-Z0-9_-]+$/.test(id) ? id : generateSafeId(col.slice(0, 4));
  const docRef = doc(db, col, docId);
  const existingSnap = id ? await getDoc(docRef) : null;
  const existingData = existingSnap?.exists() ? existingSnap.data() : null;
  const isUpdate = Boolean(existingData);

  const slug = generateSlug(rawPayload.slug || rawPayload.title || docId);
  const baseData: Record<string, any> = {
    ...rawPayload,
    id: docId,
    slug,
    authorId: existingData ? existingData.authorId : user.uid,
    authorName: (rawPayload.authorName || 'Jameel Khan').slice(0, 120),
    status,
    isFeatured: Boolean(rawPayload.isFeatured),
    updatedAt: serverTimestamp(),
  };

  if (!existingData) {
    baseData.createdAt = serverTimestamp();
    baseData.viewCount = 0;
    baseData.downloadCount = 0;
  } else {
    baseData.createdAt = existingData.createdAt;
  }

  if (status === 'published' && !baseData.publishedAt) {
    baseData.publishedAt = serverTimestamp();
  }

  const finalPayload = cleanFirestorePayload(baseData);

  try {
    if (existingData) {
      await updateDoc(docRef, finalPayload);
      // Save revision snapshot for recovery
      const revId = generateSafeId('rev');
      const snapshotClean = JSON.parse(JSON.stringify(existingData));
      await setDoc(doc(db, 'revisions', revId), {
        id: revId,
        collectionName: col,
        documentId: docId,
        title: String(existingData.title || '').slice(0, 260),
        snapshot: snapshotClean,
        savedByUid: user.uid,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, finalPayload);
    }

    await logAdminActivity(
      isUpdate ? `update_${status}` : `create_${status}`,
      `${isUpdate ? 'Updated' : 'Created'} ${COLLECTION_META[col].label}: "${finalPayload.title}" (${status})`,
      col,
      docId
    );

    return docId;
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, `${col}/${docId}`);
  }
}

export async function updatePublicationStatusAdmin(
  col: ContentCollection,
  docId: string,
  status: PublicationStatus
): Promise<void> {
  const docRef = doc(db, col, docId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found.');
    const data = snap.data();
    await updateDoc(docRef, {
      ...data,
      status,
      ...(status === 'published' && !data.publishedAt ? { publishedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });
    await logAdminActivity(`status_${status}`, `Changed status of "${data.title}" to ${status}`, col, docId);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${col}/${docId}`);
  }
}

export async function toggleFeaturedAdmin(col: ContentCollection, docId: string, isFeatured: boolean): Promise<void> {
  const docRef = doc(db, col, docId);
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Document not found.');
    const data = snap.data();
    await updateDoc(docRef, {
      ...data,
      isFeatured,
      updatedAt: serverTimestamp(),
    });
    await logAdminActivity('toggle_featured', `${isFeatured ? 'Featured' : 'Unfeatured'} "${data.title}"`, col, docId);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${col}/${docId}`);
  }
}

export async function deletePublicationPermanentlyAdmin(col: ContentCollection, docId: string, title?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, col, docId));
    await logAdminActivity('delete_permanent', `Permanently deleted ${title || docId}`, col, docId);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${col}/${docId}`);
  }
}

export async function duplicatePublicationAdmin(col: ContentCollection, docId: string): Promise<string> {
  const existing = await fetchDocumentByIdAdmin(col, docId);
  if (!existing) throw new Error('Source document not found.');
  const copyPayload = { ...existing };
  delete copyPayload.id;
  delete copyPayload.createdAt;
  delete copyPayload.updatedAt;
  delete copyPayload.publishedAt;
  copyPayload.title = `${existing.title} (Copy)`.slice(0, 260);
  copyPayload.slug = `${existing.slug}-copy-${Date.now().toString().slice(-4)}`.slice(0, 190);
  copyPayload.isFeatured = false;
  return savePublicationAdmin(col, null, copyPayload, 'draft');
}

// ---------------------------------------------------------------------------
// Categories, Profile, Settings, Messages, Revisions, Analytics Admin APIs
// ---------------------------------------------------------------------------
export async function saveCategoryAdmin(cat: Partial<Category> & { name: string }): Promise<string> {
  const id = cat.id && /^[a-zA-Z0-9_-]+$/.test(cat.id) ? cat.id : generateSafeId('cat');
  const ref = doc(db, 'categories', id);
  const existingSnap = cat.id ? await getDoc(ref) : null;
  const existingCat = existingSnap?.exists() ? existingSnap.data() : null;
  const isUpdate = Boolean(existingCat);

  const payload = cleanFirestorePayload({
    id,
    name: cat.name.trim().slice(0, 120),
    slug: generateSlug(cat.slug || cat.name),
    description: (cat.description || '').slice(0, 600),
    icon: (cat.icon || 'Scale').slice(0, 60),
    displayOrder: Number(cat.displayOrder ?? 99),
    isActive: cat.isActive ?? true,
    createdAt: existingCat ? existingCat.createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    if (isUpdate) await updateDoc(ref, payload);
    else await setDoc(ref, payload);
    await logAdminActivity('save_category', `Saved category "${payload.name}"`, 'categories', id);
    return id;
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, `categories/${id}`);
  }
}

export async function deleteCategoryAdmin(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', id));
    await logAdminActivity('delete_category', `Deleted category ${id}`, 'categories', id);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
  }
}

export async function saveProfileAdmin(profile: Partial<AuthorProfile>): Promise<void> {
  const ref = doc(db, 'profiles', 'main_profile');
  const payload = cleanFirestorePayload({
    ...DEFAULT_PROFILE_DATA,
    ...profile,
    id: 'main_profile',
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(ref, payload);
    await logAdminActivity('update_profile', 'Updated author biography and credentials', 'profiles', 'main_profile');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'profiles/main_profile');
  }
}

export async function saveSiteSettingsAdmin(settings: Partial<SiteSettings>): Promise<void> {
  const ref = doc(db, 'site_settings', 'global');
  const payload = cleanFirestorePayload({
    ...DEFAULT_SITE_SETTINGS,
    ...settings,
    id: 'global',
    updatedAt: serverTimestamp(),
  });
  try {
    await setDoc(ref, payload);
    await logAdminActivity('update_settings', 'Updated website settings and configuration', 'site_settings', 'global');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'site_settings/global');
  }
}

export async function fetchContactMessagesAdmin(): Promise<ContactMessage[]> {
  try {
    const snap = await getDocs(query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'), limit(100)));
    return snap.docs.map((d) => d.data() as ContactMessage);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'contact_messages');
  }
}

export async function updateContactMessageStatusAdmin(id: string, status: 'unread' | 'read' | 'archived'): Promise<void> {
  try {
    await updateDoc(doc(db, 'contact_messages', id), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contact_messages/${id}`);
  }
}

export async function fetchSubscribersAdmin(): Promise<SubscriberRecord[]> {
  try {
    const snap = await getDocs(query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'), limit(200)));
    return snap.docs.map((d) => d.data() as SubscriberRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'subscribers');
  }
}

export async function fetchMediaAssetsAdmin(): Promise<MediaAsset[]> {
  try {
    const snap = await getDocs(query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(200)));
    return snap.docs.map((d) => d.data() as MediaAsset);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'media');
  }
}

export async function fetchActivityLogsAdmin(): Promise<ActivityLog[]> {
  try {
    const snap = await getDocs(query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(60)));
    return snap.docs.map((d) => d.data() as ActivityLog);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'activity_logs');
  }
}

export async function fetchRevisionsAdmin(col?: string, documentId?: string): Promise<ContentRevision[]> {
  try {
    const q =
      col && documentId
        ? query(
            collection(db, 'revisions'),
            where('collectionName', '==', col),
            where('documentId', '==', documentId),
            limit(20)
          )
        : query(collection(db, 'revisions'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as ContentRevision)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'revisions');
  }
}

export async function restoreRevisionAdmin(revision: ContentRevision): Promise<void> {
  const col = revision.collectionName as ContentCollection;
  const snapshot = { ...revision.snapshot };
  await savePublicationAdmin(col, revision.documentId, snapshot, snapshot.status || 'draft');
  await logAdminActivity('restore_revision', `Restored revision for ${revision.title || revision.documentId}`, col, revision.documentId);
}

export async function fetchAnalyticsSummaryAdmin() {
  try {
    const snap = await getDocs(query(collection(db, 'analytics'), orderBy('createdAt', 'desc'), limit(500)));
    const events = snap.docs.map((d) => d.data() as AnalyticsEvent);

    let pageViews = 0;
    let totalDownloads = 0;
    const itemViews: Record<string, { title: string; entityType: string; views: number; downloads: number }> = {};
    const searchCounts: Record<string, number> = {};
    const referrers: Record<string, number> = {};

    for (const ev of events) {
      if (ev.eventType === 'page_view' || ev.eventType === 'publication_view') pageViews += 1;
      if (ev.eventType === 'file_download') totalDownloads += 1;
      if (ev.entityId && ev.title) {
        const key = `${ev.entityType || 'item'}:${ev.entityId}`;
        if (!itemViews[key]) {
          itemViews[key] = { title: ev.title, entityType: ev.entityType || 'publication', views: 0, downloads: 0 };
        }
        if (ev.eventType === 'publication_view') itemViews[key].views += 1;
        if (ev.eventType === 'file_download') itemViews[key].downloads += 1;
      }
      if (ev.eventType === 'search_query' && ev.searchTerm) {
        const term = ev.searchTerm.toLowerCase();
        searchCounts[term] = (searchCounts[term] || 0) + 1;
      }
      if (ev.referrer) {
        referrers[ev.referrer] = (referrers[ev.referrer] || 0) + 1;
      }
    }

    return {
      totalEvents: events.length,
      pageViews,
      totalDownloads,
      topPublications: Object.values(itemViews).sort((a, b) => b.views + b.downloads - (a.views + a.downloads)).slice(0, 10),
      topSearches: Object.entries(searchCounts)
        .map(([term, count]) => ({ term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topReferrers: Object.entries(referrers)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'analytics');
  }
}

// ---------------------------------------------------------------------------
// Seed & Cleanup Demonstration Data + Full Database JSON Export
// ---------------------------------------------------------------------------
export async function seedPortalDefaultsAndDemoAdmin(includeDemoContent: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Admin authentication required.');

  const batch = writeBatch(db);

  // Categories
  for (const cat of DEFAULT_CATEGORIES) {
    batch.set(doc(db, 'categories', cat.id), {
      ...cat,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Profile & Site Settings (only if missing so admin edits aren't overwritten)
  const profileSnap = await getDoc(doc(db, 'profiles', 'main_profile'));
  if (!profileSnap.exists()) {
    batch.set(doc(db, 'profiles', 'main_profile'), {
      ...DEFAULT_PROFILE_DATA,
      updatedAt: serverTimestamp(),
    });
  }

  const settingsSnap = await getDoc(doc(db, 'site_settings', 'global'));
  if (!settingsSnap.exists()) {
    batch.set(doc(db, 'site_settings', 'global'), {
      ...DEFAULT_SITE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
  }

  if (includeDemoContent) {
    const attachCommon = (item: any) => ({
      ...item,
      authorId: user.uid,
      authorName: 'Jameel Khan',
      status: 'published',
      viewCount: 0,
      downloadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    });

    DEMO_ARTICLES.forEach((a) => batch.set(doc(db, 'articles', a.id), attachCommon(a)));
    DEMO_RESEARCH_PAPERS.forEach((r) => batch.set(doc(db, 'research_papers', r.id), attachCommon(r)));
    DEMO_CASE_LAWS.forEach((c) => batch.set(doc(db, 'case_laws', c.id), attachCommon(c)));
    DEMO_JUDGMENTS.forEach((j) => batch.set(doc(db, 'judgments', j.id), attachCommon(j)));
    DEMO_PRESENTATIONS.forEach((p) => batch.set(doc(db, 'presentations', p.id), attachCommon(p)));
    DEMO_LECTURES.forEach((l) => batch.set(doc(db, 'lectures', l.id), attachCommon(l)));
    DEMO_RESOURCES.forEach((res) => batch.set(doc(db, 'resources', res.id), attachCommon(res)));
  }

  await batch.commit();
  await logAdminActivity(
    includeDemoContent ? 'seed_demo_content' : 'seed_defaults',
    includeDemoContent
      ? 'Initialized default categories, settings, and clearly marked demonstration content'
      : 'Initialized default categories and portal configuration'
  );
}

export async function removeAllDemoContentAdmin(): Promise<number> {
  const cols: ContentCollection[] = [
    'articles',
    'research_papers',
    'case_laws',
    'judgments',
    'presentations',
    'lectures',
    'resources',
  ];
  let removed = 0;
  const batch = writeBatch(db);

  for (const col of cols) {
    const snap = await getDocs(query(collection(db, col), where('isDemo', '==', true), limit(100)));
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
      removed += 1;
    });
  }

  if (removed > 0) {
    await batch.commit();
    await logAdminActivity('remove_demo_content', `Removed ${removed} demonstration records prior to launch`);
  }
  return removed;
}

export async function exportFullDatabaseBackupAdmin(): Promise<Record<string, any[]>> {
  const collectionsToExport = [
    'profiles',
    'site_settings',
    'categories',
    'articles',
    'research_papers',
    'case_laws',
    'judgments',
    'presentations',
    'lectures',
    'resources',
    'media',
    'subscribers',
    'contact_messages',
  ];
  const backup: Record<string, any[]> = {};
  for (const col of collectionsToExport) {
    const snap = await getDocs(query(collection(db, col), limit(500)));
    backup[col] = snap.docs.map((d) => d.data());
  }
  await logAdminActivity('export_backup', 'Generated full JSON database backup export');
  return backup;
}
