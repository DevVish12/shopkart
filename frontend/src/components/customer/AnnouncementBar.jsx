// Top announcement bar (above navbar) — text, visibility and color are managed
// from Admin → Settings → "Announcement Bar". Fetches public settings once.
import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';

export default function AnnouncementBar() {
  const [bar, setBar] = useState(null);

  useEffect(() => {
    api
      .get('/settings/public')
      .then((r) => {
        const s = r.data?.data || {};
        const enabled = String(s.announcement_enabled) === '1' || String(s.announcement_enabled).toLowerCase() === 'true';
        if (enabled && s.announcement_text) {
          setBar({ text: s.announcement_text, bg: s.announcement_bg || '#7c3aed' });
        }
      })
      .catch(() => {});
  }, []);

  if (!bar) return null;

  return (
    <div
      className="px-4 py-2 text-center text-sm font-medium text-white"
      style={{ backgroundColor: bar.bg }}
    >
      {bar.text}
    </div>
  );
}
