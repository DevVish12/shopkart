import React, { useRef, useState } from 'react';
import api, { imageUrl, apiErrorMessage } from '../../services/api.js';
import { useToast } from '../common/Toast.jsx';

/**
 * ImageUploadField — upload an image (logo / favicon) to the server and store
 * its public path in a setting, with live preview. Falls back to pasting a URL.
 */
export default function ImageUploadField({ label, settingKey, value, onChange, hint }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const preview = value ? imageUrl(value) : null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Only JPG, PNG or WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('key', settingKey);
      const r = await api.post('/admin/settings/media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(r.data?.data?.path || '');
      toast.success('Image uploaded.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const clear = () => onChange('');

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain p-1.5" />
          ) : (
            <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-sk-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-sk-primary-deep disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : preview ? 'Change image' : 'Upload image'}
            </button>
            {preview && (
              <button
                type="button"
                onClick={clear}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => setShowUrl((s) => !s)}
            className="mt-2 text-xs font-semibold text-sk-primary hover:underline"
          >
            {showUrl ? 'Hide URL option' : 'Or paste an image URL instead'}
          </button>
          {showUrl && (
            <input
              type="text"
              value={value?.startsWith('http') ? value : ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…"
              className="input mt-1.5 !py-2 text-xs"
            />
          )}
          {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
