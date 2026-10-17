import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import Button from '../../components/common/Button.jsx';
import Input from '../../components/common/Input.jsx';

export default function RoleForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [catalog, setCatalog] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [isSystem, setIsSystem] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [catRes, roleRes] = await Promise.all([
          api.get('/admin/roles/permissions'),
          isEdit ? api.get(`/admin/roles/${id}`) : Promise.resolve(null),
        ]);
        setCatalog(catRes.data.data?.permissions || []);
        if (roleRes) {
          const r = roleRes.data.data?.role;
          setName(r.name || '');
          setDescription(r.description || '');
          setSelected(r.permissions || []);
          setIsSystem(!!r.is_system);
        }
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not load role data.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const groups = React.useMemo(() => {
    const map = new Map();
    for (const p of catalog) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group).push(p);
    }
    return [...map.entries()];
  }, [catalog]);

  const toggle = (key) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const toggleGroup = (perms) => {
    const keys = perms.map((p) => p.key);
    const allOn = keys.every((k) => selected.includes(k));
    setSelected((s) => (allOn ? s.filter((k) => !keys.includes(k)) : [...new Set([...s, ...keys])]));
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Role name is required.');
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description.trim(), permissions: selected };
      if (isEdit) await api.put(`/admin/roles/${id}`, payload);
      else await api.post('/admin/roles', payload);
      navigate('/admin/roles');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">{isEdit ? 'Edit Role' : 'New Role'}</h1>
        <Link to="/admin/roles" className="link text-sm">← Back to roles</Link>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Role name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse Staff" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this role for?" />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Permissions</h2>
            {!isSystem && (
              <div className="flex gap-3 text-xs">
                <button type="button" className="link" onClick={() => setSelected(catalog.map((p) => p.key))}>Select all</button>
                <button type="button" className="link" onClick={() => setSelected([])}>Clear all</button>
              </div>
            )}
          </div>
          {isSystem && (
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This is a system role — its permission set is locked. You can only change its name and description.
            </p>
          )}
          <div className="mt-3 space-y-4">
            {groups.map(([group, perms]) => {
              const keys = perms.map((p) => p.key);
              const allOn = keys.every((k) => selected.includes(k));
              const someOn = keys.some((k) => selected.includes(k));
              return (
                <div key={group} className="rounded-xl border border-gray-200 p-4">
                  <label className="flex cursor-pointer items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }}
                      disabled={isSystem}
                      onChange={() => toggleGroup(perms)}
                      className="h-4 w-4 rounded text-brand-600"
                    />
                    {group}
                    <span className="text-xs font-normal text-gray-400">
                      {keys.filter((k) => selected.includes(k)).length}/{keys.length}
                    </span>
                  </label>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {perms.map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.key)}
                          disabled={isSystem}
                          onChange={() => toggle(p.key)}
                          className="h-4 w-4 rounded text-brand-600"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Link to="/admin/roles"><Button variant="secondary">Cancel</Button></Link>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Create Role'}</Button>
        </div>
      </div>
    </div>
  );
}
