import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  updateAdminProduct,
  uploadAdminProductImage,
} from '../../api/admin.js';
import { apiErrorMessage } from '../../api/http.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import { formatInr, paiseToRupeeInput, rupeesToPaise } from '../../lib/money.js';

const PAGE_SIZE = 10;
const productFormSchema = z.object({
  title: z.string().trim().min(1, 'Product name is required.'),
  slug: z.string().trim(),
  description: z.string().trim().min(1, 'Description is required.'),
  category: z.string().min(1, 'Choose a category.'),
  brand: z.string().trim().min(1, 'Brand is required.'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price in rupees.'),
  discountPercent: z.string().regex(/^\d{1,3}$/, 'Enter a discount from 0 to 100.').refine((value) => Number(value) <= 100, 'Discount cannot exceed 100%.'),
  stock: z.string().regex(/^\d+$/, 'Stock must be a whole number.'),
});

const blankForm = () => ({
  title: '',
  slug: '',
  description: '',
  category: '',
  brand: '',
  price: '',
  discountPercent: '0',
  stock: '0',
  tags: '',
  isActive: true,
  images: [],
  newImages: [],
  attributes: [{ key: '', value: '' }],
});

function productFormFrom(product) {
  return {
    title: product.title || '',
    slug: product.slug || '',
    description: product.description || '',
    category: product.category?.id || product.category?._id || product.category || '',
    brand: product.brand || '',
    price: paiseToRupeeInput(product.price),
    discountPercent: String(product.discountPercent ?? 0),
    stock: String(product.stock ?? 0),
    tags: (product.tags || []).join(', '),
    isActive: product.isActive !== false,
    images: product.images || [],
    newImages: [],
    attributes: Object.entries(product.attributes || {}).map(([key, value]) => ({ key, value })),
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const previewUrls = useRef(new Set());

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.q = search;
      if (activeFilter) params.isActive = activeFilter;
      const result = await fetchAdminProducts(params);
      setProducts(result.products || []);
      setMeta(result.meta || { total: 0, totalPages: 0 });
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, search]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    fetchAdminCategories()
      .then(setCategories)
      .catch((requestError) => setCategoryError(apiErrorMessage(requestError)));
  }, []);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function releasePreviews() {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }

  function closeForm() {
    releasePreviews();
    setFormOpen(false);
    setEditingProduct(null);
    setForm(blankForm());
    setFieldErrors({});
    setSaving(false);
  }

  function openCreateForm() {
    setEditingProduct(null);
    setForm({ ...blankForm(), category: categories[0]?.id || '' });
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setForm(productFormFrom(product));
    setFieldErrors({});
    setFormOpen(true);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  }

  function addImages(event) {
    const files = Array.from(event.target.files || []);
    const remaining = 8 - form.images.length - form.newImages.length;
    if (files.length > remaining) {
      setError('A product can have up to 8 images.');
    }
    const additions = files.slice(0, Math.max(remaining, 0)).map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { file, preview };
    });
    setForm((current) => ({ ...current, newImages: [...current.newImages, ...additions] }));
    event.target.value = '';
  }

  function removeSavedImage(index) {
    setForm((current) => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }));
  }

  function removeNewImage(index) {
    const image = form.newImages[index];
    if (image) {
      URL.revokeObjectURL(image.preview);
      previewUrls.current.delete(image.preview);
    }
    setForm((current) => ({ ...current, newImages: current.newImages.filter((_, imageIndex) => imageIndex !== index) }));
  }

  function updateAttribute(index, field, value) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, attributeIndex) =>
        attributeIndex === index ? { ...attribute, [field]: value } : attribute,
      ),
    }));
  }

  async function saveProduct(event) {
    event.preventDefault();
    const parsed = productFormSchema.safeParse(form);
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])));
      return;
    }
    if (form.images.length + form.newImages.length > 8) {
      setError('A product can have up to 8 images.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const uploadedImages = [];
      for (const image of form.newImages) {
        uploadedImages.push(await uploadAdminProductImage(image.file));
      }
      const attributes = Object.fromEntries(
        form.attributes
          .map(({ key, value }) => [key.trim(), value.trim()])
          .filter(([key, value]) => key && value),
      );
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        brand: form.brand.trim(),
        price: rupeesToPaise(form.price),
        discountPercent: Number(form.discountPercent),
        stock: Number(form.stock),
        images: [...form.images, ...uploadedImages],
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        attributes,
        isActive: form.isActive,
      };
      if (form.slug.trim()) body.slug = form.slug.trim();
      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, body);
      } else {
        await createAdminProduct(body);
      }
      closeForm();
      if (page !== 1) setPage(1);
      else await loadProducts();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    try {
      await updateAdminProduct(product.id, { isActive: !product.isActive });
      await loadProducts();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAdminProduct(deleteTarget.id);
      setDeleteTarget(null);
      await loadProducts();
    } catch (requestError) {
      setDeleteTarget(null);
      setError(apiErrorMessage(requestError));
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Products" subtitle="Create, update, and manage the products in your store." />
        <Button variant="accent" onClick={openCreateForm}><i className="bi bi-plus-lg" aria-hidden="true" /> Add product</Button>
      </div>

      {error ? <div className="mb-5 rounded-xl border border-sys-red/30 bg-card p-3 text-sm text-sys-red" role="alert">{error}</div> : null}

      <section className="overflow-hidden rounded-xxl bg-card shadow-spark-md">
        <form className="flex flex-wrap items-end gap-3 border-b border-light p-5" onSubmit={submitSearch}>
          <div className="min-w-[220px] flex-1">
            <Input id="admin-product-search" label="Search products" placeholder="Name, brand, or slug" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <div className="w-full sm:w-48">
            <Select id="admin-product-active-filter" label="Visibility" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}>
              <option value="">All products</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <Button type="submit" variant="primary" size="md"><i className="bi bi-search" aria-hidden="true" /> Search</Button>
        </form>

        {loading ? <div className="p-10"><Spinner label="Loading products" /></div> : products.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-main">No products found</p>
            <p className="mt-1 text-sm text-muted-green">Adjust your search or add the first product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead><tr className="bg-canvas text-xs uppercase text-muted-green"><th className="px-5 py-4">Product</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Price</th><th className="px-5 py-4">Stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-light hover:bg-lime-soft/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {product.images?.[0]?.url ? <img className="h-11 w-11 rounded-lg object-cover" src={product.images[0].url} alt="" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-canvas text-muted-green"><i className="bi bi-image" aria-hidden="true" /></span>}
                        <div className="min-w-0"><p className="max-w-xs truncate font-bold text-main">{product.title}</p><p className="text-xs text-muted-green">{product.brand}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-green">{product.category?.name || '—'}</td>
                    <td className="px-5 py-4 font-semibold text-main">{formatInr(product.price || 0)}</td>
                    <td className="px-5 py-4"><span className={product.stock <= 5 ? 'font-bold text-sys-orange' : 'text-main'}>{product.stock}</span></td>
                    <td className="px-5 py-4"><span className={product.isActive ? 'rounded-full bg-sys-green-bg px-2.5 py-1 text-xs font-bold text-sys-green' : 'rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-muted-green'}>{product.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" aria-label={`Edit ${product.title}`} onClick={() => openEditForm(product)}><i className="bi bi-pencil" /></Button>
                        <Button size="sm" variant="outline" onClick={() => void toggleActive(product)}>{product.isActive ? 'Deactivate' : 'Activate'}</Button>
                        <Button size="sm" variant="danger" aria-label={`Delete ${product.title}`} onClick={() => setDeleteTarget(product)}><i className="bi bi-trash3" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-light p-4">
          <p className="text-xs text-muted-green">{meta.total || 0} product(s)</p>
          {meta.totalPages > 1 ? <Pagination page={page} totalPages={meta.totalPages} onChange={setPage} /> : null}
        </div>
      </section>

      <Modal open={formOpen} title={editingProduct ? 'Edit product' : 'Add product'} onClose={closeForm} className="max-h-[92vh] max-w-3xl overflow-y-auto" footer={null}>
        <form className="space-y-5" onSubmit={saveProduct}>
          {error ? <p className="rounded-lg bg-sys-red-bg p-3 text-sm text-sys-red" role="alert">{error}</p> : null}
          {categoryError ? <p className="rounded-lg bg-sys-red-bg p-3 text-sm text-sys-red" role="alert">{categoryError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="product-title" label="Product name" value={form.title} onChange={(event) => updateField('title', event.target.value)} message={fieldErrors.title} invalid={Boolean(fieldErrors.title)} required />
            <Input id="product-brand" label="Brand" value={form.brand} onChange={(event) => updateField('brand', event.target.value)} message={fieldErrors.brand} invalid={Boolean(fieldErrors.brand)} required />
            <Input id="product-slug" label="Slug (optional)" value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="Generated from product name" />
            <Select id="product-category" label="Category" value={form.category} onChange={(event) => updateField('category', event.target.value)} message={fieldErrors.category} invalid={Boolean(fieldErrors.category)} required>
              <option value="">Choose a category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.isActive ? '' : ' (inactive)'}</option>)}
            </Select>
            <Input id="product-price" label="Price (INR)" type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateField('price', event.target.value)} message={fieldErrors.price} invalid={Boolean(fieldErrors.price)} required />
            <Input id="product-discount" label="Discount (%)" type="number" min="0" max="100" step="1" value={form.discountPercent} onChange={(event) => updateField('discountPercent', event.target.value)} message={fieldErrors.discountPercent} invalid={Boolean(fieldErrors.discountPercent)} required />
            <Input id="product-stock" label="Stock quantity" type="number" min="0" step="1" value={form.stock} onChange={(event) => updateField('stock', event.target.value)} message={fieldErrors.stock} invalid={Boolean(fieldErrors.stock)} required />
            <Input id="product-tags" label="Tags (comma separated)" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="wireless, audio" />
          </div>
          <Textarea id="product-description" label="Description" rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} message={fieldErrors.description} invalid={Boolean(fieldErrors.description)} required />

          <div>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-main">Product images</h3><span className="text-xs text-muted-green">Up to 8 images · JPEG, PNG, WebP</span></div>
            <input className="block w-full text-sm text-muted-green file:mr-3 file:rounded-md file:border-0 file:bg-lime-soft file:px-3 file:py-2 file:font-bold file:text-forest-medium" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addImages} disabled={form.images.length + form.newImages.length >= 8 || saving} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {form.images.map((image, index) => <div key={`${image.publicId || image.url}-${index}`} className="relative aspect-square overflow-hidden rounded-lg bg-canvas"><img src={image.url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label={`Remove image ${index + 1}`} onClick={() => removeSavedImage(index)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-forest-dark text-white"><i className="bi bi-x-lg" /></button></div>)}
              {form.newImages.map((image, index) => <div key={image.preview} className="relative aspect-square overflow-hidden rounded-lg bg-canvas"><img src={image.preview} alt={`New product image ${index + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label={`Remove new image ${index + 1}`} onClick={() => removeNewImage(index)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-forest-dark text-white"><i className="bi bi-x-lg" /></button></div>)}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-main">Attributes</h3><Button type="button" size="sm" variant="outline" onClick={() => setForm((current) => ({ ...current, attributes: [...current.attributes, { key: '', value: '' }] }))}><i className="bi bi-plus-lg" /> Add attribute</Button></div>
            <div className="space-y-2">
              {form.attributes.map((attribute, index) => (
                <div key={`attribute-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <Input id={`attribute-key-${index}`} label={index === 0 ? 'Name' : undefined} placeholder="Material" value={attribute.key} onChange={(event) => updateAttribute(index, 'key', event.target.value)} />
                  <Input id={`attribute-value-${index}`} label={index === 0 ? 'Value' : undefined} placeholder="Aluminium" value={attribute.value} onChange={(event) => updateAttribute(index, 'value', event.target.value)} />
                  <Button type="button" size="sm" variant="ghost" aria-label="Remove attribute" onClick={() => setForm((current) => ({ ...current, attributes: current.attributes.filter((_, rowIndex) => rowIndex !== index) }))}><i className="bi bi-trash3" /></Button>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold text-main">
            <input type="checkbox" className="h-4 w-4 accent-forest-medium" checked={form.isActive} onChange={(event) => updateField('isActive', event.target.checked)} />
            Active in storefront
          </label>
          <div className="flex justify-end gap-3 border-t border-light pt-4">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={saving || categories.length === 0}>
              {saving ? <Spinner label="Saving product" /> : editingProduct ? 'Save changes' : 'Create product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete product?" onClose={() => setDeleteTarget(null)} footer={(
        <><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={() => void confirmDelete()}>Delete product</Button></>
      )}>
        <p>This permanently deletes <strong>{deleteTarget?.title}</strong> and removes its stored images.</p>
      </Modal>
    </div>
  );
}
