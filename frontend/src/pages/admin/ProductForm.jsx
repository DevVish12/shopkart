import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';
import { useToast } from '../../components/common/Toast.jsx';

const EMPTY_VARIANT = { size: '', color: '', weight_label: '', sku: '', price: '', mrp: '', stock: 0 };

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', subcategory_id: '', brand_id: '',
    description: '', short_description: '', price: '', mrp: '', gst_percent: 18,
    weight_kg: '', dimensions: '', stock: 0, status: 'active',
    is_featured: false, is_new_arrival: false, is_best_seller: false, is_flash_sale: false,
    flash_sale_price: '', flash_sale_ends_at: '',
    meta_title: '', meta_description: '',
  });
  const [variants, setVariants] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    api.get('/admin/categories').then((r) => setCategories(r.data.data || [])).catch(() => {});
    api.get('/admin/brands').then((r) => setBrands(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/admin/products/${id}`)
      .then((r) => {
        const p = r.data.data.product;
        setForm({
          name: p.name || '', sku: p.sku || '', category_id: p.categoryId || '', subcategory_id: p.subcategoryId || '', brand_id: p.brandId || '',
          description: p.description || '', short_description: p.shortDescription || '', price: p.price ?? '', mrp: p.mrp ?? '', gst_percent: p.gstPercent ?? 18,
          weight_kg: p.weightKg || '', dimensions: p.dimensions || '', stock: p.stock ?? 0, status: p.status || 'active',
          is_featured: !!p.isFeatured, is_new_arrival: !!p.isNewArrival, is_best_seller: !!p.isBestSeller, is_flash_sale: !!p.isFlashSale,
          flash_sale_price: p.flashSalePrice || '',
          flash_sale_ends_at: p.flashSaleEndsAt ? new Date(p.flashSaleEndsAt).toISOString().slice(0, 16) : '',
          meta_title: p.metaTitle || '', meta_description: p.metaDescription || '',
        });
        setVariants((p.variants || []).map((v) => ({ ...EMPTY_VARIANT, ...v, weight_label: v.weightLabel ?? v.weight_label ?? '', price: v.price ?? '', mrp: v.mrp ?? '' })));
        setExistingImages(p.images || []);
      })
      .catch(() => setError('Could not load product.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newImages]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('SKU is required.');
    if (!form.category_id) return setError('Category is required.');
    if (form.price === '' || Number(form.price) < 0) return setError('Enter a valid price.');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
      });
      fd.append('variants', JSON.stringify(variants.filter((v) => v.size || v.color || v.weight_label).map((v) => ({ ...v, price: v.price === '' ? null : v.price, mrp: v.mrp === '' ? null : v.mrp }))));
      newImages.forEach((f) => fd.append('images[]', f));
      const r = isEdit
        ? await api.put(`/admin/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/admin/products/${r.data.data.product?.id || id}/edit`, { replace: true });
      setNewImages([]);
      if (!isEdit) navigate('/admin/products');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save product.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async (imageId) => {
    try {
      await api.delete(`/admin/products/${id}/images/${imageId}`);
      setExistingImages((list) => list.filter((i) => i.id !== imageId));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const addVariant = () => setVariants((v) => [...v, { ...EMPTY_VARIANT }]);
  const setVariant = (i, k, val) => setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, [k]: val } : v)));
  const removeVariant = (i) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  if (loading) return <Loader />;

  const inputCls = 'sm:col-span-1';

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/products" className="link text-sm">← Back to products</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{isEdit ? 'Edit Product' : 'Add Product'}</h1>

      <form onSubmit={submit} className="mt-5 space-y-6">
        <div className="card p-6">
          <h2 className="font-bold">Basic Information</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Product name *" value={form.name} onChange={set('name')} className="sm:col-span-2" />
            <Input label="SKU *" value={form.sku} onChange={set('sku')} />
            <div>
              <label className="label">Category *</label>
              <select value={form.category_id} onChange={set('category_id')} className="input">
                <option value="">Select category</option>
                {categories.filter((c) => !c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sub-category</label>
              <select value={form.subcategory_id} onChange={set('subcategory_id')} className="input">
                <option value="">None</option>
                {categories.filter((c) => c.parent_id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Brand</label>
              <select value={form.brand_id} onChange={set('brand_id')} className="input">
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Short description</label>
              <textarea value={form.short_description} onChange={set('short_description')} className="input" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Full description</label>
              <textarea value={form.description} onChange={set('description')} className="input" rows={5} />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold">Pricing & Inventory</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Input label="Price (₹) *" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} className={inputCls} />
            <Input label="MRP (₹)" type="number" min="0" step="0.01" value={form.mrp} onChange={set('mrp')} className={inputCls} />
            <Input label="Stock" type="number" min="0" value={form.stock} onChange={set('stock')} className={inputCls} />
            <Input label="GST %" type="number" min="0" max="100" step="0.01" value={form.gst_percent} onChange={set('gst_percent')} className={inputCls} />
            <Input label="Weight (kg)" type="number" min="0" step="0.001" value={form.weight_kg} onChange={set('weight_kg')} className={inputCls} />
            <Input label="Dimensions" value={form.dimensions} onChange={set('dimensions')} placeholder="L x W x H cm" className={inputCls} />
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={set('status')} className="input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Variants</h2>
            <Button type="button" variant="outline" onClick={addVariant}>+ Add Variant</Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Size, colour or weight combinations. Leave a field blank if it does not apply.</p>
          <div className="mt-4 space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-7">
                <input placeholder="Size" value={v.size} onChange={(e) => setVariant(i, 'size', e.target.value)} className="input" />
                <input placeholder="Colour" value={v.color} onChange={(e) => setVariant(i, 'color', e.target.value)} className="input" />
                <input placeholder="Weight label" value={v.weight_label} onChange={(e) => setVariant(i, 'weight_label', e.target.value)} className="input" />
                <input placeholder="SKU" value={v.sku} onChange={(e) => setVariant(i, 'sku', e.target.value)} className="input" />
                <input placeholder="Price ₹" type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariant(i, 'price', e.target.value)} className="input" />
                <input placeholder="Stock" type="number" min="0" value={v.stock} onChange={(e) => setVariant(i, 'stock', e.target.value)} className="input" />
                <button type="button" onClick={() => removeVariant(i)} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
              </div>
            ))}
            {variants.length === 0 && <p className="text-sm text-gray-400">No variants — the product sells as a single item.</p>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold">Images</h2>
          {isEdit && existingImages.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {existingImages.map((img) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <img src={imageUrl(img.image_url)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => deleteImage(img.id)} className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white opacity-0 group-hover:opacity-100">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setNewImages([...e.target.files])} className="input mt-3" />
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {previews.map((u, i) => (
                <img key={i} src={u} alt={`Preview ${i + 1}`} className="aspect-square rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-bold">Visibility & Flags</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ['is_featured', 'Featured product'],
              ['is_new_arrival', 'New arrival'],
              ['is_best_seller', 'Best seller'],
              ['is_flash_sale', 'Flash sale'],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!form[k]} onChange={set(k)} className="h-4 w-4 rounded text-brand-600" />
                {label}
              </label>
            ))}
          </div>
          {form.is_flash_sale && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Flash sale price (₹)" type="number" min="0" step="0.01" value={form.flash_sale_price} onChange={set('flash_sale_price')} />
              <Input label="Flash sale ends at" type="datetime-local" value={form.flash_sale_ends_at} onChange={set('flash_sale_ends_at')} />
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Meta title (SEO)" value={form.meta_title} onChange={set('meta_title')} />
            <Input label="Meta description (SEO)" value={form.meta_description} onChange={set('meta_description')} />
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create Product'}</Button>
          <Link to="/admin/products" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
