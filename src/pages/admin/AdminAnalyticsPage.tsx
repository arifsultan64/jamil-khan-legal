import React, { useEffect, useState } from 'react';
import { fetchActivityLogsAdmin, fetchAnalyticsSummaryAdmin } from '../../services/firestoreService';
import type { ActivityLog } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';

export const AdminAnalyticsPage: React.FC = () => {
  const [summary, setSummary] = useState<{
    totalEvents: number;
    pageViews: number;
    totalDownloads: number;
    topPublications: Array<{ title: string; entityType: string; views: number; downloads: number }>;
    topSearches: Array<{ term: string; count: number }>;
    topReferrers: Array<{ source: string; count: number }>;
  } | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  usePageSeo({
    title: 'Analytics & Audit Logs | Admin CMS',
    description: 'Privacy-conscious publication analytics and administrator security audit logs.',
    canonicalPath: '/admin/analytics',
  });

  useEffect(() => {
    Promise.all([fetchAnalyticsSummaryAdmin(), fetchActivityLogsAdmin()]).then(([sum, act]) => {
      setSummary(sum);
      setLogs(act);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Portal Analytics &amp; Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-1">
          Privacy-conscious telemetry recorded directly from real visitor views, downloads, and searches. No fabricated counts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <span className="text-xs text-slate-500 block mb-1">Recorded Page &amp; Article Views</span>
          <span className="font-mono text-3xl font-bold text-[#0F2342] tabular-nums">{summary?.pageViews ?? 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <span className="text-xs text-slate-500 block mb-1">Recorded File Downloads</span>
          <span className="font-mono text-3xl font-bold text-[#164937] tabular-nums">{summary?.totalDownloads ?? 0}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <span className="text-xs text-slate-500 block mb-1">Total Telemetry Events (Last 500)</span>
          <span className="font-mono text-3xl font-bold text-[#0F2342] tabular-nums">{summary?.totalEvents ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-md p-6">
          <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-4">Most Accessed Publications</h2>
          {!summary || summary.topPublications.length === 0 ? (
            <p className="text-sm text-slate-500">No publication view events recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="py-2">Publication</th>
                  <th className="py-2 text-right">Views</th>
                  <th className="py-2 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.topPublications.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 pr-3 font-medium text-[#0F2342]">{p.title}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{p.views}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{p.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-md p-6 space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-3">Most Searched Keywords</h2>
            {!summary || summary.topSearches.length === 0 ? (
              <p className="text-sm text-slate-500">No search queries logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {summary.topSearches.map((s) => (
                  <li key={s.term} className="py-2 flex justify-between">
                    <span className="text-slate-700">{s.term}</span>
                    <span className="font-mono text-xs tabular-nums text-slate-500">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-3">Traffic Sources</h2>
            {!summary || summary.topReferrers.length === 0 ? (
              <p className="text-sm text-slate-500">No referrer events logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {summary.topReferrers.map((r) => (
                  <li key={r.source} className="py-2 flex justify-between gap-4">
                    <span className="text-slate-700 truncate">{r.source}</span>
                    <span className="font-mono text-xs tabular-nums text-slate-500">{r.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-md p-6">
        <h2 className="font-serif text-xl font-bold text-[#0F2342] mb-4">Security &amp; Publishing Activity Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500 uppercase">
              <tr>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Summary</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-4 font-mono text-[#164937]">{l.action}</td>
                  <td className="py-2.5 pr-4 text-slate-700">{l.summary}</td>
                  <td className="py-2.5 pr-4 text-slate-500">{l.actorEmail || l.actorUid}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-400">{formatDisplayDate(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
