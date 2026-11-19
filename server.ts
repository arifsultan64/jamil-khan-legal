import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8')
);

const FIRESTORE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId || 'ai-studio-7bfa8e9f-1afd-4af5-8e40-5f6d1439b5b4';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${FIRESTORE_DATABASE_ID}/documents`;
const BOOTSTRAPPED_ADMINS = new Set(['ayeshakhania123@gmail.com']);

// ---------------------------------------------------------------------------
// Firestore REST Value Serializers
// ---------------------------------------------------------------------------
function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return null;
}

function fromFirestoreDoc(doc: any): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = doc.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  if (!out.id && doc.name) {
    out.id = doc.name.split('/').pop();
  }
  return out;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return fields;
}

async function runPublishedQuery(collectionId: string, maxResults = 50): Promise<Record<string, any>[]> {
  const url = `${FIRESTORE_BASE}:runQuery`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: 'published' },
          },
        },
        limit: maxResults,
      },
    }),
  });
  if (!resp.ok) {
    return [];
  }
  const rows = (await resp.json()) as any[];
  return rows
    .filter((r) => r.document)
    .map((r) => fromFirestoreDoc(r.document))
    .sort((a, b) => Date.parse(b.publishedAt || b.createdAt || '') - Date.parse(a.publishedAt || a.createdAt || ''));
}

async function getPublicDocument(collectionId: string, docId: string): Promise<Record<string, any> | null> {
  const resp = await fetch(`${FIRESTORE_BASE}/${collectionId}/${encodeURIComponent(docId)}`);
  if (!resp.ok) return null;
  const json = await resp.json();
  return fromFirestoreDoc(json);
}

async function listActiveCategories(): Promise<Record<string, any>[]> {
  const resp = await fetch(`${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'categories' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'isActive' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        limit: 50,
      },
    }),
  });
  if (!resp.ok) return [];
  const rows = (await resp.json()) as any[];
  return rows
    .filter((r) => r.document)
    .map((r) => fromFirestoreDoc(r.document))
    .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
}

// ---------------------------------------------------------------------------
// Rate Limiting & Security Middleware
// ---------------------------------------------------------------------------
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please wait and try again.' },
      });
    }
    bucket.count += 1;
    return next();
  };
}

interface VerifiedAdminRequest extends Request {
  adminAuth?: {
    uid: string;
    email: string;
    idToken: string;
  };
}

async function requireAdminAuth(req: VerifiedAdminRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing Bearer Firebase ID token.' },
      });
    }
    const idToken = header.slice('Bearer '.length).trim();
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Empty authorization token.' },
      });
    }

    // Verify token via Firebase Auth Identity Toolkit REST API (works without GCP IAM keys)
    const lookupResp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupResp.ok) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Firebase ID token verification failed.' },
      });
    }

    const lookupData = (await lookupResp.json()) as { users?: Array<{ localId: string; email?: string; emailVerified?: boolean }> };
    const user = lookupData.users?.[0];
    if (!user || !user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Verified email authentication is required.' },
      });
    }

    const emailLower = (user.email || '').toLowerCase();
    let authorized = BOOTSTRAPPED_ADMINS.has(emailLower);

    if (!authorized) {
      // Check /admins/{uid} using the caller's token
      const adminDocResp = await fetch(`${FIRESTORE_BASE}/admins/${encodeURIComponent(user.localId)}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      authorized = adminDocResp.ok;
    }

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'ADMIN_REQUIRED', message: 'Administrator authorization required.' },
      });
    }

    req.adminAuth = { uid: user.localId, email: user.email || '', idToken };
    return next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: err instanceof Error ? err.message : 'Authentication verification error.' },
    });
  }
}

const PublicationCreateSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(128).optional(),
  title: z.string().min(2).max(260),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(200).optional(),
  description: z.string().max(3000).optional().default(''),
  content: z.string().max(250000).optional().default(''),
  abstract: z.string().max(5000).optional(),
  courtName: z.string().max(180).optional(),
  court: z.string().max(180).optional(),
  year: z.number().int().min(1800).max(2100).optional(),
  citation: z.string().max(160).optional(),
  caseNumber: z.string().max(120).optional(),
  categoryId: z.string().min(1).max(128),
  categoryName: z.string().max(120).optional(),
  tags: z.array(z.string()).max(20).optional(),
  keywords: z.array(z.string()).max(30).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'unpublished']).default('draft'),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().max(160).optional(),
  seoDescription: z.string().max(320).optional(),
});

function buildSlug(text: string): string {
  const s = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.length >= 2 ? s.slice(0, 180) : `pub-${Date.now()}`;
}

function paginate<T>(items: T[], pageRaw: unknown, limitRaw: unknown) {
  const page = Math.max(1, Number(pageRaw) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limitRaw) || 12));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const slice = items.slice((page - 1) * perPage, page * perPage);
  return {
    items: slice,
    pagination: { page, limit: perPage, total, totalPages },
  };
}

// ---------------------------------------------------------------------------
// OpenAPI 3.0.3 Specification (Android Kotlin / Jetpack Compose Compatible)
// ---------------------------------------------------------------------------
function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Jameel Khan | Legal Research & Publications API',
      version: '1.0.0',
      description:
        'Versioned REST API powering the Jameel Khan Legal Research & Publications web portal and future native Android (Kotlin / Jetpack Compose) mobile client.',
    },
    servers: [{ url: `${baseUrl}/api/v1`, description: 'Primary API v1 Server' }],
    components: {
      securitySchemes: {
        FirebaseBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase Authentication ID Token for verified administrator requests.',
        },
      },
    },
    paths: {
      '/home': { get: { summary: 'Get dynamically configured homepage payload', tags: ['Public'] } },
      '/profile': { get: { summary: 'Get author biography and public profile', tags: ['Public'] } },
      '/articles': { get: { summary: 'List published legal articles (paginated)', tags: ['Public'] } },
      '/articles/{slug}': { get: { summary: 'Get single published article by slug', tags: ['Public'] } },
      '/research': { get: { summary: 'List published research papers', tags: ['Public'] } },
      '/research/{slug}': { get: { summary: 'Get single research paper by slug', tags: ['Public'] } },
      '/case-laws': { get: { summary: 'List published case laws', tags: ['Public'] } },
      '/case-laws/{id}': { get: { summary: 'Get single case law by ID or slug', tags: ['Public'] } },
      '/judgments': { get: { summary: 'List published judgments', tags: ['Public'] } },
      '/judgments/{id}': { get: { summary: 'Get single judgment by ID or slug', tags: ['Public'] } },
      '/presentations': { get: { summary: 'List published presentations', tags: ['Public'] } },
      '/presentations/{id}': { get: { summary: 'Get single presentation by ID or slug', tags: ['Public'] } },
      '/categories': { get: { summary: 'List active legal categories', tags: ['Public'] } },
      '/publications/latest': { get: { summary: 'Get latest published items across all collections', tags: ['Public'] } },
      '/search': {
        get: {
          summary: 'Search across all published legal content',
          tags: ['Public'],
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Keywords, title, citation, or court' },
            { name: 'type', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'year', in: 'query', schema: { type: 'string' } },
          ],
        },
      },
      '/admin/articles': {
        post: {
          summary: 'Create a legal article',
          tags: ['Admin'],
          security: [{ FirebaseBearerAuth: [] }],
        },
      },
      '/admin/articles/{id}': {
        put: { summary: 'Update a legal article', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] },
        delete: { summary: 'Delete a legal article', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] },
      },
      '/admin/research': { post: { summary: 'Create a research paper', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] } },
      '/admin/case-laws': { post: { summary: 'Create a case law record', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] } },
      '/admin/judgments': { post: { summary: 'Create a judgment record', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] } },
      '/admin/presentations': { post: { summary: 'Create a presentation record', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] } },
      '/admin/upload': { post: { summary: 'Validate & register an attachment upload', tags: ['Admin'], security: [{ FirebaseBearerAuth: [] }] } },
    },
  };
}

// ---------------------------------------------------------------------------
// App Initialization
// ---------------------------------------------------------------------------
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // Security headers & CORS for future Android/API clients
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // -------------------------------------------------------------------------
  // Public API v1 Router
  // -------------------------------------------------------------------------
  const apiV1 = express.Router();

  apiV1.get('/health', (_req, res) => {
    res.json({
      success: true,
      service: 'jameel-khan-legal-portal-api',
      version: 'v1',
      timestamp: new Date().toISOString(),
    });
  });

  apiV1.get('/openapi.json', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.json(buildOpenApiSpec(baseUrl));
  });

  apiV1.get('/docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>API v1 Documentation | Jameel Khan</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body style="margin:0;background:#FBF9F5;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
  });

  apiV1.get('/home', async (_req, res) => {
    try {
      const [settings, profile, categories, articles, research, judgments, caseLaws, presentations] = await Promise.all([
        getPublicDocument('site_settings', 'global'),
        getPublicDocument('profiles', 'main_profile'),
        listActiveCategories(),
        runPublishedQuery('articles', 12),
        runPublishedQuery('research_papers', 8),
        runPublishedQuery('judgments', 8),
        runPublishedQuery('case_laws', 8),
        runPublishedQuery('presentations', 8),
      ]);
      res.json({
        success: true,
        data: { settings, profile, categories, articles, research, judgments, caseLaws, presentations },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: String(err) } });
    }
  });

  apiV1.get('/profile', async (_req, res) => {
    const profile = await getPublicDocument('profiles', 'main_profile');
    res.json({ success: true, data: profile });
  });

  apiV1.get('/categories', async (_req, res) => {
    const categories = await listActiveCategories();
    res.json({ success: true, data: categories });
  });

  const bindCollectionEndpoints = (routePath: string, collectionName: string) => {
    apiV1.get(`/${routePath}`, async (req, res) => {
      const all = await runPublishedQuery(collectionName, 100);
      const { category, year } = req.query;
      const filtered = all.filter((item) => {
        if (category && item.categoryId !== category) return false;
        if (year && String(item.year || '') !== String(year)) return false;
        return true;
      });
      const result = paginate(filtered, req.query.page, req.query.limit);
      res.json({ success: true, data: result.items, pagination: result.pagination });
    });

    apiV1.get(`/${routePath}/:identifier`, async (req, res) => {
      const idOrSlug = req.params.identifier;
      const all = await runPublishedQuery(collectionName, 100);
      const found = all.find((item) => item.slug === idOrSlug || item.id === idOrSlug);
      if (!found) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Published record not found.' },
        });
      }
      return res.json({ success: true, data: found });
    });
  };

  bindCollectionEndpoints('articles', 'articles');
  bindCollectionEndpoints('research', 'research_papers');
  bindCollectionEndpoints('case-laws', 'case_laws');
  bindCollectionEndpoints('judgments', 'judgments');
  bindCollectionEndpoints('presentations', 'presentations');
  bindCollectionEndpoints('lectures', 'lectures');
  bindCollectionEndpoints('resources', 'resources');

  apiV1.get('/publications/latest', async (req, res) => {
    const collections = ['articles', 'research_papers', 'case_laws', 'judgments', 'presentations', 'lectures', 'resources'];
    const all = (
      await Promise.all(
        collections.map(async (col) => {
          const items = await runPublishedQuery(col, 25);
          return items.map((item): Record<string, any> => ({ ...item, collection: col }));
        })
      )
    )
      .flat()
      .sort((a, b) => Date.parse(b.publishedAt || b.createdAt || '') - Date.parse(a.publishedAt || a.createdAt || ''));

    const result = paginate(all, req.query.page, req.query.limit);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  });

  apiV1.get('/search', rateLimit(60, 60_000), async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const typeFilter = String(req.query.type || 'all');
    const categoryFilter = String(req.query.category || 'all');
    const yearFilter = String(req.query.year || 'all');

    const collections =
      typeFilter !== 'all'
        ? [typeFilter]
        : ['articles', 'research_papers', 'case_laws', 'judgments', 'presentations', 'lectures', 'resources'];

    const all = (
      await Promise.all(
        collections.map(async (col) => {
          const items = await runPublishedQuery(col, 80);
          return items.map((item): Record<string, any> => ({ ...item, collection: col }));
        })
      )
    ).flat();

    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const matched = all.filter((item) => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (yearFilter !== 'all') {
        const y = item.year || (item.publishedAt ? new Date(item.publishedAt).getFullYear() : 0);
        if (String(y) !== yearFilter) return false;
      }
      if (terms.length === 0) return true;
      const hay = [
        item.title,
        item.description,
        item.abstract,
        item.categoryName,
        item.citation,
        item.caseNumber,
        item.court,
        item.courtName,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.keywords) ? item.keywords : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });

    const result = paginate(matched, req.query.page, req.query.limit);
    res.json({ success: true, query: q, data: result.items, pagination: result.pagination });
  });

  // -------------------------------------------------------------------------
  // Protected Admin REST API v1 Endpoints
  // -------------------------------------------------------------------------
  const writeToFirestoreRest = async (
    collectionId: string,
    docId: string,
    data: Record<string, any>,
    idToken: string,
    isPatch = false
  ) => {
    const url = `${FIRESTORE_BASE}/${collectionId}/${encodeURIComponent(docId)}`;
    const resp = await fetch(url, {
      method: isPatch ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: toFirestoreFields(data) }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Firestore rejected write (${resp.status}): ${errBody}`);
    }
    return fromFirestoreDoc(await resp.json());
  };

  const handleAdminCreate = (collectionName: string, extraRequired?: (parsed: any) => Record<string, any>) => {
    return async (req: VerifiedAdminRequest, res: Response) => {
      const parsed = PublicationCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        });
      }
      const d = parsed.data;
      const docId = d.id || `${collectionName.slice(0, 4)}_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const payload: Record<string, any> = {
        id: docId,
        title: d.title,
        slug: d.slug || buildSlug(d.title),
        description: d.description || '',
        content: d.content || '',
        categoryId: d.categoryId,
        categoryName: d.categoryName || '',
        tags: d.tags || [],
        keywords: d.keywords || [],
        authorId: req.adminAuth!.uid,
        authorName: 'Jameel Khan',
        status: d.status,
        isFeatured: d.isFeatured,
        seoTitle: d.seoTitle || d.title.slice(0, 160),
        seoDescription: d.seoDescription || d.description.slice(0, 320),
        viewCount: 0,
        downloadCount: 0,
        createdAt: new Date(nowIso),
        updatedAt: new Date(nowIso),
        ...(d.status === 'published' ? { publishedAt: new Date(nowIso) } : {}),
        ...(extraRequired ? extraRequired(d) : {}),
      };

      try {
        const created = await writeToFirestoreRest(collectionName, docId, payload, req.adminAuth!.idToken, true);
        return res.status(201).json({ success: true, data: created });
      } catch (err) {
        return res.status(403).json({
          success: false,
          error: { code: 'WRITE_FAILED', message: err instanceof Error ? err.message : 'Write failed' },
        });
      }
    };
  };

  apiV1.post('/admin/articles', rateLimit(30, 60_000), requireAdminAuth, handleAdminCreate('articles'));

  apiV1.put('/admin/articles/:id', rateLimit(30, 60_000), requireAdminAuth, async (req: VerifiedAdminRequest, res) => {
    const docId = req.params.id;
    const parsed = PublicationCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    try {
      const existing = await getPublicDocument('articles', docId);
      if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found.' } });
      const merged = {
        ...existing,
        ...parsed.data,
        id: docId,
        authorId: existing.authorId || req.adminAuth!.uid,
        createdAt: existing.createdAt ? new Date(existing.createdAt) : new Date(),
        updatedAt: new Date(),
      };
      const updated = await writeToFirestoreRest('articles', docId, merged, req.adminAuth!.idToken, true);
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(403).json({ success: false, error: { code: 'UPDATE_FAILED', message: String(err) } });
    }
  });

  apiV1.delete('/admin/articles/:id', rateLimit(20, 60_000), requireAdminAuth, async (req: VerifiedAdminRequest, res) => {
    const docId = req.params.id;
    const resp = await fetch(`${FIRESTORE_BASE}/articles/${encodeURIComponent(docId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${req.adminAuth!.idToken}` },
    });
    if (!resp.ok) {
      return res.status(resp.status).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Delete failed.' } });
    }
    return res.json({ success: true, deletedId: docId });
  });

  apiV1.post(
    '/admin/research',
    rateLimit(30, 60_000),
    requireAdminAuth,
    handleAdminCreate('research_papers', (d) => ({ abstract: d.abstract || d.description || '' }))
  );

  apiV1.post(
    '/admin/case-laws',
    rateLimit(30, 60_000),
    requireAdminAuth,
    handleAdminCreate('case_laws', (d) => ({
      courtName: d.courtName || 'Court Name Pending',
      year: d.year || new Date().getFullYear(),
      citation: d.citation || '',
      caseNumber: d.caseNumber || '',
    }))
  );

  apiV1.post(
    '/admin/judgments',
    rateLimit(30, 60_000),
    requireAdminAuth,
    handleAdminCreate('judgments', (d) => ({
      court: d.court || d.courtName || 'Court Name Pending',
      year: d.year || new Date().getFullYear(),
      citation: d.citation || '',
      caseNumber: d.caseNumber || '',
    }))
  );

  apiV1.post('/admin/presentations', rateLimit(30, 60_000), requireAdminAuth, handleAdminCreate('presentations'));

  apiV1.post('/admin/upload', rateLimit(30, 60_000), requireAdminAuth, (req: VerifiedAdminRequest, res) => {
    const schema = z.object({
      fileName: z.string().min(1).max(260),
      mimeType: z.enum([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]),
      sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_UPLOAD_METADATA', details: parsed.error.flatten() } });
    }
    return res.json({
      success: true,
      message: 'File validated for Firebase Storage upload.',
      allowedBucket: firebaseConfig.storageBucket,
      validated: parsed.data,
    });
  });

  app.use('/api/v1', apiV1);

  // -------------------------------------------------------------------------
  // Dynamic SEO Sitemap & Robots.txt
  // -------------------------------------------------------------------------
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(
      `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/v1/admin/\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const staticPaths = [
      '/',
      '/about',
      '/articles',
      '/research',
      '/case-laws',
      '/judgments',
      '/presentations',
      '/resources',
      '/archive',
      '/contact',
      '/search',
    ];

    const [articles, research, caseLaws, judgments, presentations] = await Promise.all([
      runPublishedQuery('articles', 100),
      runPublishedQuery('research_papers', 100),
      runPublishedQuery('case_laws', 100),
      runPublishedQuery('judgments', 100),
      runPublishedQuery('presentations', 100),
    ]);

    const dynamicPaths = [
      ...articles.map((a) => `/articles/${a.slug || a.id}`),
      ...research.map((r) => `/research/${r.slug || r.id}`),
      ...caseLaws.map((c) => `/case-laws/${c.slug || c.id}`),
      ...judgments.map((j) => `/judgments/${j.slug || j.id}`),
      ...presentations.map((p) => `/presentations/${p.slug || p.id}`),
    ];

    const urls = [...staticPaths, ...dynamicPaths]
      .map((p) => `  <url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>`)
      .join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
  });

  // -------------------------------------------------------------------------
  // Vite Middleware (Dev) or Static Dist Serving (Prod)
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Jameel Khan Legal Research Portal running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
