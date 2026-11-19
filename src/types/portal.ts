export type PublicationStatus = 'draft' | 'scheduled' | 'published' | 'unpublished' | 'deleted';

export type ContentCollection =
  | 'articles'
  | 'research_papers'
  | 'case_laws'
  | 'judgments'
  | 'presentations'
  | 'lectures'
  | 'resources';

export type ResourceKind =
  | 'lecture_notes'
  | 'training_material'
  | 'seminar_paper'
  | 'workshop_resource'
  | 'legal_guideline'
  | 'academic_handout';

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  visibility: 'public' | 'private';
}

export interface BasePublication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  categoryId: string;
  categoryName?: string;
  tags?: string[];
  keywords?: string[];
  featuredImage?: string;
  attachments?: AttachmentItem[];
  authorId: string;
  authorName: string;
  status: PublicationStatus;
  isFeatured: boolean;
  isDemo?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  viewCount?: number;
  downloadCount?: number;
  createdAt: any;
  updatedAt: any;
  publishedAt?: any;
  scheduledAt?: any;
}

export interface Article extends BasePublication {
  description: string;
  content: string;
  footnotes?: string;
  references?: string;
  relatedIds?: string[];
  readingTimeMinutes?: number;
}

export interface ResearchPaper extends BasePublication {
  abstract: string;
  introduction?: string;
  methodology?: string;
  analysis?: string;
  findings?: string;
  conclusion?: string;
  bibliography?: string;
  pdfUrl?: string;
}

export interface CaseLaw extends BasePublication {
  caseNumber?: string;
  courtName: string;
  citation?: string;
  year: number;
  benchDetails?: string;
  subjectMatter?: string;
  legalPrinciples?: string;
  statutoryProvisions?: string[];
  headnotes?: string;
  observations?: string;
  pdfUrl?: string;
  externalSourceUrl?: string;
  relatedJudgments?: string[];
}

export interface Judgment extends BasePublication {
  caseNumber?: string;
  court: string;
  judgmentDate?: string;
  year?: number;
  citation?: string;
  subject?: string;
  legalIssues?: string;
  finalDecision?: string;
  pdfUrl?: string;
  relatedCaseLaws?: string[];
}

export interface Presentation extends BasePublication {
  description: string;
  topic?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
  relatedArticles?: string[];
}

export interface LectureOrResource extends BasePublication {
  resourceKind: ResourceKind;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface TagRecord {
  id: string;
  name: string;
  slug: string;
  usageCount?: number;
  createdAt: any;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  storagePath?: string;
  downloadUrl: string;
  mimeType: string;
  extension?: string;
  sizeBytes: number;
  visibility: 'public' | 'private';
  uploadedBy: string;
  createdAt: any;
}

export interface AuthorProfile {
  id: string;
  fullName: string;
  headline: string;
  biography: string;
  academicBackground?: string;
  professionalExperience?: string;
  judicialCareer?: string;
  researchInterests?: string[];
  academicContributions?: string;
  achievements?: string;
  profileImageUrl?: string;
  updatedAt: any;
}

export interface HomepageSectionConfig {
  key:
    | 'hero'
    | 'featured_research'
    | 'latest_articles'
    | 'recent_judgments'
    | 'latest_case_laws'
    | 'featured_presentations'
    | 'popular_publications'
    | 'categories'
    | 'about_author'
    | 'newsletter';
  label: string;
  enabled: boolean;
  order: number;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  heroTitle?: string;
  heroSubtitle?: string;
  welcomeMessage?: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactOffice?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    website?: string;
  };
  homepageSections?: HomepageSectionConfig[];
  newsletterEnabled: boolean;
  contactFormEnabled: boolean;
  maxUploadSizeMb: number;
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
  footerText?: string;
  privacyPolicy?: string;
  disclaimer?: string;
  termsAndConditions?: string;
  inactivityTimeoutMinutes?: number;
  updatedAt: any;
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: any;
}

export interface SubscriberRecord {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed';
  createdAt: any;
}

export interface AnalyticsEvent {
  id: string;
  eventType: 'page_view' | 'publication_view' | 'file_download' | 'search_query';
  entityType?: string;
  entityId?: string;
  title?: string;
  searchTerm?: string;
  referrer?: string;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  targetCollection?: string;
  targetId?: string;
  summary: string;
  createdAt: any;
}

export interface ContentRevision {
  id: string;
  collectionName: string;
  documentId: string;
  title?: string;
  snapshot: Record<string, any>;
  savedByUid: string;
  createdAt: any;
}

export interface UnifiedPublication {
  id: string;
  collection: ContentCollection;
  typeLabel: string;
  routeBase: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  keywords: string[];
  featuredImage?: string;
  authorName: string;
  status: PublicationStatus;
  isFeatured: boolean;
  isDemo?: boolean;
  citation?: string;
  caseNumber?: string;
  court?: string;
  year?: number;
  viewCount: number;
  downloadCount: number;
  publishedAtMs: number;
  updatedAtMs: number;
  raw: any;
}

export const FIELD_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  SLUG_REGEX: /^[a-z0-9-]+$/,
  TITLE_MAX: 260,
  SLUG_MAX: 200,
  DESCRIPTION_MAX: 3000,
  CONTENT_MAX: 250000,
  ABSTRACT_MAX: 5000,
  SEO_TITLE_MAX: 160,
  SEO_DESC_MAX: 320,
} as const;

export const BOOTSTRAPPED_ADMIN_EMAILS = ['ayeshakhania123@gmail.com'] as const;
