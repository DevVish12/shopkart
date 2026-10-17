import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';
import Loader from '../../components/common/Loader.jsx';

export default function CmsForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ slug: '', title: '', content: '', status: 'published' });

  useEffect(() => {
    if (!isEdit) return;
    api
      .get('/admin/cms')
      .then((r) => {
        const p = (r.data.data || []).find((x) => String(x.id) === String(id));
        if (p) setForm({ slug: p.slug, title: p.title, content: p.content || '', status: p.status });
        else setError('Page not found.');
      })
      .catch(() => setError('Could not load page.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.slug.trim()) return setError('Slug is required.');
    setSaving(true);
    try {
      const payload = { slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'), title: form.title.trim(), content: form.content, status: form.status };
      if (isEdit) await api.put(`/admin/cms/${id}`, payload);
      else await api.post('/admin/cms', payload);
      navigate('/admin/cms');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/cms" className="link text-sm">← Back to pages</Link>
      <h1 className="mt-2 text-2xl font-extrabold">{isEdit ? 'Edit Page' : 'Add Page'}</h1>
      <form onSubmit={submit} className="card mt-5 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Slug * (URL path)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} hint="e.g. privacy-policy" />
        </div>
        <div>
          <label className="label">Content *</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input font-mono" rows={16} placeholder="HTML content — use <h2>, <p>, <ul> etc." />
          <p className="mt-1 text-xs text-gray-500">Simple HTML is supported (headings, paragraphs, lists, links).</p>
        </div>
        <div className="max-w-xs">
          <label className="label">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create Page'}</Button>
          <Link to="/admin/cms" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
