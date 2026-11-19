import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import {
  deleteCategoryAdmin,
  fetchAllCategoriesAdmin,
  saveCategoryAdmin,
} from '../../services/firestoreService';
import type { Category } from '../../types/portal';
import { generateSlug } from '../../utils/formatters';
import { usePageSeo } from '../../utils/seo';

export const AdminCategoriesPage: React.FC = () => {
  const { refreshPortalGlobals } = usePortal();
  const [cats, setCats] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Scale');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState('');

  usePageSeo({
    title: 'Categories Management | Admin CMS',
    description: 'Create, reorder, activate, and organize legal categories.',
    canonicalPath: '/admin/categories',
  });

  const loadCats = useCallback(async () => {
    const list = await fetchAllCategoriesAdmin();
    setCats(list);
  }, []);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Scale');
    setDisplayOrder(cats.length + 1);
    setIsActive(true);
  };

  const handleEdit = (c: Category) => {
    setEditingId(c.id);
    setName(c.name);
    setSlug(c.slug);
    setDescription(c.description || '');
    setIcon(c.icon || 'Scale');
    setDisplayOrder(c.displayOrder || 1);
    setIsActive(c.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    await saveCategoryAdmin({
      id: editingId || undefined,
      name,
      slug: slug || generateSlug(name),
      description,
      icon,
      displayOrder,
      isActive,
    });
    setMsg(`Saved category "${name}".`);
    resetForm();
    await loadCats();
    await refreshPortalGlobals();
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"? Make sure no publications still depend on it.`)) return;
    await deleteCategoryAdmin(c.id);
    await loadCats();
    await refreshPortalGlobals();
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="font-serif text-3xl font-bold text-[#0F2342]">Content Categories</h1>
        <p className="text-xs text-slate-500 mt-1">
          Create, rename, reorder, activate, or remove legal subject categories.
        </p>
      </div>

      {msg && <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-[#103628] rounded">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-4 bg-white border border-slate-200 rounded-md p-5 space-y-4">
          <h2 className="font-serif text-xl font-bold text-[#0F2342]">
            {editingId ? 'Edit Category' : 'Add Category'}
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editingId) setSlug(generateSlug(e.target.value));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
              <input type="number" min={1} value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Icon Name</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-[#0F2342]" />
            Active on Public Portal
          </label>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0F2342] rounded-md cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              {editingId ? 'Update Category' : 'Create Category'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-3 py-2 text-xs border border-slate-300 rounded-md cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums">{c.displayOrder}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0F2342]">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-500 line-clamp-1">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">{c.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => handleEdit(c)} className="p-1.5 text-slate-600 hover:text-[#0F2342] mr-1 cursor-pointer" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(c)} className="p-1.5 text-red-700 hover:text-red-900 cursor-pointer" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
