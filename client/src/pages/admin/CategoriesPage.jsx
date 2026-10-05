import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  createAdminCategory,
  deleteAdminCategory,
  fetchAdminCategories,
  updateAdminCategory,
} from '../../api/admin.js';
import { apiErrorMessage } from '../../api/http.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.'),
  slug: z.string().trim(),
  image: z.string().trim().max(2000, 'Image URL is too long.'),
});

function emptyForm() {
  return { name: '', slug: '', image: '', isActive: true };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [nameError, setNameError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await fetchAdminCategories());
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function openCreate() {
    setEditingCategory(null);
    setForm(emptyForm());
    setNameError('');
    setModalOpen(true);
  }

  function openEdit(category) {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      image: category.image || '',
      isActive: category.isActive !== false,
    });
    setNameError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingCategory(null);
    setForm(emptyForm());
  }

  async function saveCategory(event) {
    event.preventDefault();
    const parsed = categorySchema.safeParse(form);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message || 'Check the category name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { name: parsed.data.name, isActive: form.isActive };
      if (parsed.data.slug) body.slug = parsed.data.slug;
      if (parsed.data.image) body.image = parsed.data.image;
      if (editingCategory) await updateAdminCategory(editingCategory.id, body);
      else await createAdminCategory(body);
      setModalOpen(false);
      setEditingCategory(null);
      setForm(emptyForm());
      await loadCategories();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category) {
    try {
      await updateAdminCategory(category.id, { isActive: !category.isActive });
      await loadCategories();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAdminCategory(deleteTarget.id);
      setDeleteTarget(null);
      await loadCategories();
    } catch (requestError) {
      setDeleteTarget(null);
      setError(apiErrorMessage(requestError));
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Categories" subtitle="Organize the products customers browse in your storefront." />
        <Button variant="accent" onClick={openCreate}><i className="bi bi-plus-lg" aria-hidden="true" /> Add category</Button>
      </div>

      {error ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sys-red/30 bg-card p-3 text-sm text-sys-red" role="alert">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void loadCategories()}>Try again</Button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xxl bg-card shadow-spark-md">
        {loading ? <div className="p-10"><Spinner label="Loading categories" /></div> : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-main">No categories yet</p>
            <p className="mt-1 text-sm text-muted-green">Create a category before adding products.</p>
            <Button className="mt-5" variant="accent" onClick={openCreate}><i className="bi bi-plus-lg" /> Create category</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="bg-canvas text-xs uppercase text-muted-green"><th className="px-5 py-4">Category</th><th className="px-5 py-4">Slug</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-light hover:bg-lime-soft/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {category.image ? <img src={category.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-canvas text-muted-green"><i className="bi bi-grid" aria-hidden="true" /></span>}
                        <span className="font-bold text-main">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-green">{category.slug}</td>
                    <td className="px-5 py-4"><span className={category.isActive ? 'rounded-full bg-sys-green-bg px-2.5 py-1 text-xs font-bold text-sys-green' : 'rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-muted-green'}>{category.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><i className="bi bi-pencil" /></Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleActive(category)}>{category.isActive ? 'Deactivate' : 'Activate'}</Button>
                        <Button size="sm" variant="danger" aria-label={`Delete ${category.name}`} onClick={() => setDeleteTarget(category)}><i className="bi bi-trash3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={modalOpen} title={editingCategory ? 'Edit category' : 'Create category'} onClose={closeModal} footer={null}>
        <form className="space-y-4" onSubmit={saveCategory}>
          <Input id="category-name" label="Name" value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setNameError(''); }} message={nameError} invalid={Boolean(nameError)} required />
          <Input id="category-slug" label="Slug (optional)" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Generated from category name" />
          <Input id="category-image" label="Image URL (optional)" type="url" value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} placeholder="https://example.com/category.jpg" />
          {form.image ? <img src={form.image} alt="Category preview" className="aspect-[3/1] w-full rounded-lg object-cover" /> : null}
          <label className="flex items-center gap-3 text-sm font-semibold text-main">
            <input type="checkbox" className="h-4 w-4 accent-forest-medium" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active in storefront
          </label>
          <div className="flex justify-end gap-3 border-t border-light pt-4">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : editingCategory ? 'Save changes' : 'Create category'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete category?" onClose={() => setDeleteTarget(null)} footer={(
        <><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={() => void confirmDelete()}>Delete category</Button></>
      )}>
        <p>Delete <strong>{deleteTarget?.name}</strong>? Categories assigned to a product cannot be deleted.</p>
      </Modal>
    </div>
  );
}
