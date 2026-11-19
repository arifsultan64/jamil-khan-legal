import React, { useEffect, useState } from 'react';
import { Download, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  exportFullDatabaseBackupAdmin,
  fetchRevisionsAdmin,
  restoreRevisionAdmin,
} from '../../services/firestoreService';
import type { ContentRevision } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';

export const AdminBackupPage: React.FC = () => {
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  usePageSeo({
    title: 'Backup & Data Recovery | Admin CMS',
    description: 'Export database backups and recover previous content revisions.',
    canonicalPath: '/admin/backup',
  });

  useEffect(() => {
    fetchRevisionsAdmin().then(setRevisions);
  }, []);

  const handleExportJson = async () => {
    setExporting(true);
    setMsg('');
    try {
      const data = await exportFullDatabaseBackupAdmin();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jameel-khan-portal-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('Full database JSON backup exported successfully.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async (rev: ContentRevision) => {
    if (!window.confirm(`Restore "${rev.title || rev.documentId}" to its snapshot from ${formatDisplayDate(rev.createdAt)}?`)) {
      return;
    }
    await restoreRevisionAdmin(rev);
    setMsg(`Restored "${rev.title || rev.documentId}" from revision snapshot.`);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Backup &amp; Data Recovery</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manual database export, content revision recovery, and Google Cloud scheduled backup status.
        </p>
      </div>

      {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-[#103628] rounded">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#0F2342]">Database Export</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Download a complete JSON snapshot of all published and draft articles, research papers, case laws, judgments, presentations, categories, profile, settings, subscribers, and inquiries.
          </p>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2342] rounded-md hover:bg-[#18345E] cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting Backup...' : 'Download Full JSON Backup'}
          </button>
        </section>

        <section className="bg-amber-50/70 border border-amber-200 rounded-md p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Cloud Scheduled Backups Status
          </div>
          <p className="text-xs text-amber-950 leading-relaxed">
            Automated daily Cloud Firestore &amp; Cloud Storage bucket backups require enabling a scheduled backup policy in your Google Cloud Console (`gcloud firestore backups schedules create`). Until configured in GCP, use the JSON Export tool on the left regularly.
          </p>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-md p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#0F2342]">Content Revision History</h2>
        <p className="text-xs text-slate-500">
          Automatic snapshots saved prior to edits allow immediate recovery if published or draft text is accidentally overwritten.
        </p>

        {revisions.length === 0 ? (
          <p className="text-sm text-slate-500">No edit revisions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 uppercase">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Module</th>
                  <th className="py-2 pr-4">Snapshot Date</th>
                  <th className="py-2 text-right">Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {revisions.map((rev) => (
                  <tr key={rev.id}>
                    <td className="py-2.5 pr-4 font-medium text-[#0F2342]">{rev.title || rev.documentId}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-600">{rev.collectionName}</td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500">{formatDisplayDate(rev.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRestore(rev)}
                        className="inline-flex items-center gap-1 text-[#0F2342] font-semibold hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
