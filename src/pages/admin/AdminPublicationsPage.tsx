import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Edit3, FilePlus2, Search, Star, Trash2 } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  COLLECTION_META,
  deletePublicationPermanentlyAdmin,
  duplicatePublicationAdmin,
  fetchCollectionAdmin,
  normalizeToUnified,
  toggleFeaturedAdmin,
  updatePublicationStatusAdmin,
} from '../../services/firestoreService';
import type { ContentCollection, PublicationStatus, UnifiedPublication } from '../../types/portal';
import { formatDisplayDate } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';

export const AdminPublicationsPage: React.FC = () => {
  const { categories } = usePortal();
  const [items, setItems] = useState<UnifiedPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [colFilter, setColFilter] = useState<ContentCollection | 'all'>('all');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | 'all'>('all');
  const [confirmDelete, setConfirmDelete] = useState<UnifiedPublication | null>(null);

  usePageSeo({
    title: 'Manage Publications | Admin CMS',
    description: 'Manage all articles, research papers, case laws, judgments, and presentations.',
    canonicalPath: '/admin/publications',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const cols: ContentCollection[] = [
        'articles',
        'research_papers',
        'case_laws',
        'judgments',
        'presentations',
        'lectures',
        'resources',
      ];
      const all = (
        await Promise.all(
          cols.map(async (col) => {
            const rows = await fetchCollectionAdmin(col, 200);
            return rows.map((r) => normalizeToUnified(col, r));
          })
        )
      )
        .flat()
        .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      setItems(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (colFilter !== 'all' && item.collection !== colFilter) return false;
      if (catFilter !== 'all' && item.categoryId !== catFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (q && !`${item.title} ${item.citation || ''} ${item.categoryName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, colFilter, catFilter, statusFilter, searchQuery]);

  const handleStatusChange = async (item: UnifiedPublication, nextStatus: PublicationStatus) => {
    await updatePublicationStatusAdmin(item.collection, item.id, nextStatus);
    loadAll();
  };

  const handleDuplicate = async (item: UnifiedPublication) => {
    await duplicatePublicationAdmin(item.collection, item.id);
    loadAll();
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    await deletePublicationPermanentlyAdmin(confirmDelete.collection, confirmDelete.id, confirmDelete.title);
    setConfirmDelete(null);
    loadAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Manage Publications</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, publish, unpublish, duplicate, feature, restore, or delete records across all modules.
          </p>
        </div>
        <Link
          to="/admin/editor"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F2342] rounded-md hover:bg-[#18345E]"
        >
          <FilePlus2 className="w-4 h-4" />
          New Publication
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-md p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or citation..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>

        <select value={colFilter} onChange={(e) => setColFilter(e.target.value as any)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="all">All Modules</option>
          {(Object.keys(COLLECTION_META) as ContentCollection[]).map((c) => (
            <option key={c} value={c}>{COLLECTION_META[c].label}s</option>
          ))}
        </select>

        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white">
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="unpublished">Unpublished</option>
          <option value="deleted">Trash / Deleted</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading publications...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No publications match the current filter.</td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={`${item.collection}-${item.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-[#0F2342] truncate">{item.title}</div>
                    {item.isDemo && <span className="text-[11px] font-mono text-[#9E7B3B]">Demonstration Sample</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.typeLabel}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{item.categoryName}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value as PublicationStatus)}
                      aria-label={`Status for ${item.title}`}
                      className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="unpublished">Unpublished</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap tabular-nums">
                    {formatDisplayDate(item.updatedAtMs)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleFeaturedAdmin(item.collection, item.id, !item.isFeatured).then(loadAll)}
                        title={item.isFeatured ? 'Unfeature' : 'Feature on Homepage'}
                        className={`p-1.5 rounded border cursor-pointer ${
                          item.isFeatured ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-400 hover:text-[#0F2342]'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        to={`/admin/editor/${item.collection}/${item.id}`}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-[#0F2342]"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(item)}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-[#0F2342] cursor-pointer"
                        title="Duplicate as Draft"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item)}
                        className="p-1.5 rounded border border-slate-200 text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Permanent Deletion Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-md border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 className="font-serif text-xl font-bold text-[#0F2342]">Confirm Permanent Deletion</h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong>{confirmDelete.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-md text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="px-4 py-2 text-xs font-medium bg-red-700 text-white rounded-md hover:bg-red-800 cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
