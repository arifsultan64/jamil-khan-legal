import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PortalProvider } from './contexts/PortalAuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { CatalogListPage } from './pages/public/CatalogListPage';
import { PublicationDetailPage } from './pages/public/PublicationDetailPage';
import { SearchPage } from './pages/public/SearchPage';
import { ContactPage } from './pages/public/ContactPage';
import { LegalPage } from './pages/public/LegalPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

// Code-split Admin CMS bundle so public readers enjoy fast initial page loads
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminEditorPage = lazy(() =>
  import('./pages/admin/AdminEditorPage').then((m) => ({ default: m.AdminEditorPage }))
);
const AdminPublicationsPage = lazy(() =>
  import('./pages/admin/AdminPublicationsPage').then((m) => ({ default: m.AdminPublicationsPage }))
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage }))
);
const AdminMediaPage = lazy(() =>
  import('./pages/admin/AdminMediaPage').then((m) => ({ default: m.AdminMediaPage }))
);
const AdminProfilePage = lazy(() =>
  import('./pages/admin/AdminProfilePage').then((m) => ({ default: m.AdminProfilePage }))
);
const AdminInboxPage = lazy(() =>
  import('./pages/admin/AdminInboxPage').then((m) => ({ default: m.AdminInboxPage }))
);
const AdminAnalyticsPage = lazy(() =>
  import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage }))
);
const AdminBackupPage = lazy(() =>
  import('./pages/admin/AdminBackupPage').then((m) => ({ default: m.AdminBackupPage }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const AdminRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminLayout>
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs font-mono uppercase tracking-widest text-slate-500">
          Loading CMS Workspace...
        </div>
      }
    >
      {children}
    </Suspense>
  </AdminLayout>
);

export default function App() {
  return (
    <ErrorBoundary>
      <PortalProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Portal Routes */}
            <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/articles" element={<PublicLayout><CatalogListPage mode="articles" /></PublicLayout>} />
            <Route path="/articles/:slug" element={<PublicLayout><PublicationDetailPage collectionName="articles" /></PublicLayout>} />
            <Route path="/research" element={<PublicLayout><CatalogListPage mode="research_papers" /></PublicLayout>} />
            <Route path="/research/:slug" element={<PublicLayout><PublicationDetailPage collectionName="research_papers" /></PublicLayout>} />
            <Route path="/case-laws" element={<PublicLayout><CatalogListPage mode="case_laws" /></PublicLayout>} />
            <Route path="/case-laws/:slug" element={<PublicLayout><PublicationDetailPage collectionName="case_laws" /></PublicLayout>} />
            <Route path="/judgments" element={<PublicLayout><CatalogListPage mode="judgments" /></PublicLayout>} />
            <Route path="/judgments/:slug" element={<PublicLayout><PublicationDetailPage collectionName="judgments" /></PublicLayout>} />
            <Route path="/presentations" element={<PublicLayout><CatalogListPage mode="presentations" /></PublicLayout>} />
            <Route path="/presentations/:slug" element={<PublicLayout><PublicationDetailPage collectionName="presentations" /></PublicLayout>} />
            <Route path="/resources" element={<PublicLayout><CatalogListPage mode="resources" /></PublicLayout>} />
            <Route path="/resources/:slug" element={<PublicLayout><PublicationDetailPage collectionName="resources" /></PublicLayout>} />
            <Route path="/archive" element={<PublicLayout><CatalogListPage mode="archive" /></PublicLayout>} />
            <Route path="/search" element={<PublicLayout><SearchPage /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
            <Route path="/legal/disclaimer" element={<PublicLayout><LegalPage kind="disclaimer" /></PublicLayout>} />
            <Route path="/legal/privacy-policy" element={<PublicLayout><LegalPage kind="privacy" /></PublicLayout>} />
            <Route path="/legal/terms" element={<PublicLayout><LegalPage kind="terms" /></PublicLayout>} />

            {/* Private Admin Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminRouteWrapper><AdminDashboardPage /></AdminRouteWrapper>} />
            <Route path="/admin/editor" element={<AdminRouteWrapper><AdminEditorPage /></AdminRouteWrapper>} />
            <Route path="/admin/editor/:collectionParam/:idParam" element={<AdminRouteWrapper><AdminEditorPage /></AdminRouteWrapper>} />
            <Route path="/admin/publications" element={<AdminRouteWrapper><AdminPublicationsPage /></AdminRouteWrapper>} />
            <Route path="/admin/categories" element={<AdminRouteWrapper><AdminCategoriesPage /></AdminRouteWrapper>} />
            <Route path="/admin/media" element={<AdminRouteWrapper><AdminMediaPage /></AdminRouteWrapper>} />
            <Route path="/admin/profile" element={<AdminRouteWrapper><AdminProfilePage /></AdminRouteWrapper>} />
            <Route path="/admin/inbox" element={<AdminRouteWrapper><AdminInboxPage /></AdminRouteWrapper>} />
            <Route path="/admin/analytics" element={<AdminRouteWrapper><AdminAnalyticsPage /></AdminRouteWrapper>} />
            <Route path="/admin/backup" element={<AdminRouteWrapper><AdminBackupPage /></AdminRouteWrapper>} />
            <Route path="/admin/settings" element={<AdminRouteWrapper><AdminSettingsPage /></AdminRouteWrapper>} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PortalProvider>
    </ErrorBoundary>
  );
}
