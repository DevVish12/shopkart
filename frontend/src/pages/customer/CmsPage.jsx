import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import Seo from '../../components/common/Seo.jsx';

export default function CmsPage({ slug }) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/cms/${slug}`)
      .then((r) => setPage(r.data.data.page))
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Loader fullPage />;
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-gray-500">The page you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Seo title={page.title} path={`/p/${slug}`} />
      <h1 className="text-3xl font-extrabold">{page.title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none text-gray-600 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-sk-ink [&_h3]:mt-4 [&_h3]:font-bold [&_h3]:text-sk-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_ul]:mb-3"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}
