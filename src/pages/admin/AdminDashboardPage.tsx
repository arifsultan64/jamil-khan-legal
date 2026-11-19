import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Database,
  FilePlus2,
  FileText,
  Gavel,
  HardDrive,
  Presentation,
  Scale,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  fetchActivityLogsAdmin,
  fetchAnalyticsSummaryAdmin,
  fetchCollectionAdmin,
  removeAllDemoContentAdmin,
  seedPortalDefaultsAndDemoAdmin,
} from '../../services/firestoreService';
import type { ActivityLog } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { GoogleConnectButton } from '../../components/admin/GoogleConnectButton';

export const AdminDashboardPage: React.FC = () => {
  const { refreshPortalGlobals, driveConnected, connectGoogleDrive } = usePortal();
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    articlesPublished: 0,
    researchPublished: 0,
    caseLawsPublished: 0,
    judgmentsPublished: 0,
    presentationsPublished: 0,
    totalDrafts: 0,
    totalDownloads: 0,
    totalViews: 0,
    demoCount: 0,
  });

  usePageSeo({
    title: 'Admin Dashboard | Jameel Khan',
    description: 'Publishing overview and administration dashboard.',
    canonicalPath: '/admin/dashboard',
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [articles, research, caseLaws, judgments, presentations, lectures, resources, analytics, activity] =
        await Promise.all([
          fetchCollectionAdmin('articles', 200),
          fetchCollectionAdmin('research_papers', 200),
          fetchCollectionAdmin('case_laws', 200),
          fetchCollectionAdmin('judgments', 200),
          fetchCollectionAdmin('presentations', 200),
          fetchCollectionAdmin('lectures', 200),
          fetchCollectionAdmin('resources', 200),
          fetchAnalyticsSummaryAdmin(),
          fetchActivityLogsAdmin(),
        ]);

      const all = [...articles, ...research, ...caseLaws, ...judgments, ...presentations, ...lectures, ...resources];
      const drafts = all.filter((i) => i.status === 'draft' || i.status === 'unpublished' || i.status === 'scheduled').length;
      const demoCount = all.filter((i) => i.isDemo).length;

      setStats({
        articlesPublished: articles.filter((i) => i.status === 'published').length,
        researchPublished: research.filter((i) => i.status === 'published').length,
        caseLawsPublished: caseLaws.filter((i) => i.status === 'published').length,
        judgmentsPublished: judgments.filter((i) => i.status === 'published').length,
        presentationsPublished: presentations.filter((i) => i.status === 'published').length,
        totalDrafts: drafts,
        totalDownloads: analytics.totalDownloads,
        totalViews: analytics.pageViews,
        demoCount,
      });
      setLogs(activity.slice(0, 12));
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSeed = async (includeDemo: boolean) => {
    setActionBusy(true);
    setStatusMessage('');
    try {
      await seedPortalDefaultsAndDemoAdmin(includeDemo);
      await refreshPortalGlobals();
      await loadDashboard();
      setStatusMessage(
        includeDemo
          ? 'Default categories, settings, and clearly marked demonstration content initialized.'
          : 'Default categories and portal configuration initialized.'
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Initialization failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemoveDemo = async () => {
    setActionBusy(true);
    try {
      const removed = await removeAllDemoContentAdmin();
      await loadDashboard();
      setStatusMessage(`Removed ${removed} demonstration record${removed === 1 ? '' : 's'}.`);
      setConfirmDemoOpen(false);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to remove demonstration content.');
    } finally {
      setActionBusy(false);
    }
  };

  const quickActions = [
    { label: 'Write New Article', to: '/admin/editor?type=articles', icon: FileText },
    { label: 'Add Research Paper', to: '/admin/editor?type=research_papers', icon: BookOpen },
    { label: 'Upload Judgment', to: '/admin/editor?type=judgments', icon: Gavel },
    { label: 'Add Case Law', to: '/admin/editor?type=case_laws', icon: Scale },
    { label: 'Upload Presentation', to: '/admin/editor?type=presentations', icon: Presentation },
    { label: 'Google Drive & Media', to: '/admin/media', icon: HardDrive },
  ];

  const metricCards = [
    { label: 'Published Articles', value: stats.articlesPublished },
    { label: 'Research Papers', value: stats.researchPublished },
    { label: 'Case Laws', value: stats.caseLawsPublished },
    { label: 'Judgments', value: stats.judgmentsPublished },
    { label: 'Presentations', value: stats.presentationsPublished },
    { label: 'Drafts & Pending', value: stats.totalDrafts },
    { label: 'Recorded Views', value: stats.totalViews },
    { label: 'File Downloads', value: stats.totalDownloads },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#164937] mb-1">
            Administrator Workspace
          </p>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">
            Portal Overview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!driveConnected ? (
            <GoogleConnectButton
              compact
              onClick={() => connectGoogleDrive().catch((e) => setStatusMessage(e.message))}
              label="Connect Google Drive"
            />
          ) : (
            <Link
              to="/admin/media"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#164937] bg-emerald-50 border border-emerald-200 rounded-md hover:border-[#164937]"
            >
              <HardDrive className="w-3.5 h-3.5" />
              Google Drive Linked
            </Link>
          )}
          <Link
            to="/admin/editor"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E]"
          >
            <FilePlus2 className="w-4 h-4" />
            New Publication
          </Link>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-white border border-slate-200 rounded-md text-sm text-[#0F2342]">
          {statusMessage}
        </div>
      )}

      {/* Real Database Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-md p-5">
            <span className="text-xs font-medium text-slate-500 block mb-1">{m.label}</span>
            <span className="font-mono text-2xl font-semibold text-[#0F2342] tabular-nums">
              {loading ? '—' : m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <Link
                key={qa.label}
                to={qa.to}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-md hover:border-[#0F2342] transition-colors"
              >
                <div className="w-9 h-9 rounded bg-[#F4F0E8] flex items-center justify-center text-[#0F2342] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-[#0F2342]">{qa.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity Log */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="font-serif text-xl font-bold text-[#0F2342]">Recent Activity</h2>
            <Link to="/admin/analytics" className="text-xs font-medium text-[#164937] hover:underline">
              Full Audit Log &rarr;
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">No recorded administrative activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{log.summary}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{log.action}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-400 whitespace-nowrap tabular-nums">
                    {formatDisplayDate(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Initial Setup & Demonstration Content Controls */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#0F2342] pb-2 border-b border-slate-100">
            Portal Initialization &amp; Demo Controls
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Use these controls to initialize the 15 default legal categories and site configuration, or load clearly marked demonstration records for testing before removing them prior to launch.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleSeed(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded-md hover:border-[#0F2342] cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              Initialize Default Categories &amp; Settings
            </button>

            <button
              type="button"
              disabled={actionBusy}
              onClick={() => handleSeed(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-[#164937] rounded-md hover:bg-[#103628] cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Load Demonstration Sample Content
            </button>

            {stats.demoCount > 0 && (
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => setConfirmDemoOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove All Demonstration Content ({stats.demoCount})
              </button>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={confirmDemoOpen}
        title="Remove Demonstration Content?"
        description={`Remove all ${stats.demoCount} demonstration sample record(s) across all collections? Your own authored publications will not be touched.`}
        confirmLabel="Remove Demo Content"
        variant="danger"
        busy={actionBusy}
        onConfirm={handleRemoveDemo}
        onCancel={() => setConfirmDemoOpen(false)}
      />
    </div>
  );
};
