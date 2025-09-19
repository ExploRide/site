const ALLOWED_ORIGINS = new Set([
  'https://exploride.pl',
  'https://www.exploride.pl',
  'http://localhost:5173',
  'http://localhost:3000'
]);

function corsHeaders(origin) {
  const h = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) h.set('Access-Control-Allow-Origin', origin);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}
function withCors(resp, request) {
  const ch = corsHeaders(request.headers.get('Origin'));
  for (const [k, v] of ch) resp.headers.set(k, v);
  return resp;
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

const GALLERY_ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/api/fb/oembed':
          return withCors(await handleFbOEmbed(url, request, env), request);
        case '/api/fb/posts':
          return withCors(await handleFbPosts(url, request, env), request);
        case '/api/ig/media':
          return withCors(await handleIgMedia(url, request, env), request);
        case '/api/gallery/list':
          return withCors(await handleGalleryList(request, env), request);
        default:
          return withCors(json({ error: 'Not found', path }, 404), request);
      }
    } catch (e) {
      return withCors(json({ error: String(e) }, 500), request);
    }
  }
};

async function handleIgMedia(url, request, env) {
  const pageId = url.searchParams.get('page_id');
  const limitParam = parseInt(url.searchParams.get('limit') || '9', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 9;
  const token = env.FB_PAGE_TOKEN;

  if (!pageId || !token) {
    return json({ items: [] });
  }

  const igId = await getIgUserId(pageId, token);
  if (!igId) {
    return json({ items: [] });
  }

  const out = await getIgMedia(igId, token, limit);
  return json(out);
}

async function getIgUserId(pageId, token) {
  const u = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}`);
  u.searchParams.set('fields', 'instagram_business_account{id,username}');
  u.searchParams.set('access_token', token);

  const res = await fetch(u.toString());
  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    console.error('IG user id JSON parse error', err);
  }

  if (!res.ok) {
    console.error('IG user id fetch error', data);
    return null;
  }

  return data.instagram_business_account?.id || null;
}

async function getIgMedia(igUserId, token, limit) {
  const u = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(igUserId)}/media`);
  u.searchParams.set(
    'fields',
    'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_type,media_url,thumbnail_url}'
  );
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('access_token', token);

  const res = await fetch(u.toString());
  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    console.error('IG media JSON parse error', err);
  }

  if (!res.ok) {
    const message = data?.error?.message || `Unexpected status ${res.status}`;
    throw new Error(`IG media fetch failed: ${message}`);
  }

  const items = Array.isArray(data.data)
    ? data.data
        .map(m => {
          let src = null;
          if (m.media_type === 'IMAGE') {
            src = m.media_url || null;
          } else if (m.media_type === 'VIDEO') {
            src = m.thumbnail_url || m.media_url || null;
          } else if (m.media_type === 'CAROUSEL_ALBUM') {
            const child = Array.isArray(m.children?.data) ? m.children.data.find(Boolean) : null;
            if (child) {
              src = child.thumbnail_url || child.media_url || null;
            }
          }

          return {
            id: m.id,
            caption: m.caption || '',
            type: m.media_type,
            src,
            permalink: m.permalink,
            timestamp: m.timestamp
          };
        })
        .filter(item => !!item.src)
    : [];

  items.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return (tb || 0) - (ta || 0);
  });

  return { items };
}

async function handleFbPosts(url, request, env) {
  const pageId = url.searchParams.get('page_id');
  const limitParam = parseInt(url.searchParams.get('limit') || '6', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 6;
  const token = env.FB_PAGE_TOKEN;

  if (!pageId || !token) {
    return json({ items: [] });
  }

  const items = await getFbPosts(pageId, token, limit);
  return json({ items });
}

async function getFbPosts(pageId, token, limit) {
  const u = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/posts`);
  u.searchParams.set(
    'fields',
    'id,message,permalink_url,created_time,is_published,full_picture,attachments{media_type,media,subattachments{media}}'
  );
  u.searchParams.set('limit', String(limit));
  u.searchParams.set('access_token', token);

  const res = await fetch(u.toString());
  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    console.error('FB posts JSON parse error', err);
  }

  if (!res.ok) {
    const message = data?.error?.message || `Unexpected status ${res.status}`;
    throw new Error(`FB posts fetch failed: ${message}`);
  }

  const rawItems = Array.isArray(data.data) ? data.data : [];
  const filtered = rawItems.filter(
    post => post && post.is_published !== false && (post.permalink_url || post.permalink || post.url)
  );
  const limited = filtered.slice(0, Number(limit) || 1);

  const mappedItems = limited.map(post => ({
    id: post.id,
    message: post.message || '',
    permalink_url: post.permalink_url || post.permalink || post.url || '',
    created_time: post.created_time || '',
    is_published: post.is_published !== false,
    media: collectPostMedia(post)
  }));

  mappedItems.sort((a, b) => {
    const ta = a.created_time ? Date.parse(a.created_time) : 0;
    const tb = b.created_time ? Date.parse(b.created_time) : 0;
    return (tb || 0) - (ta || 0);
  });

  return mappedItems;
}

async function handleFbOEmbed(url, request, env) {
  const target = url.searchParams.get('url');
  const maxwidth = url.searchParams.get('maxwidth') || '';
  const omitscript = url.searchParams.get('omitscript');

  if (!target) {
    return json({ error: 'Missing url' }, 400);
  }

  const isVideo = /\/(videos|reel)\//i.test(target);
  const endpoint = isVideo ? 'oembed_video' : 'oembed_post';
  const fbUrl = new URL(`https://graph.facebook.com/v23.0/${endpoint}`);
  fbUrl.searchParams.set('url', target);
  if (maxwidth) {
    fbUrl.searchParams.set('maxwidth', maxwidth);
  }
  if (omitscript === 'true' || omitscript === 'false') {
    fbUrl.searchParams.set('omitscript', omitscript);
  }

  const accessToken = env.FB_APP_ID && env.FB_APP_SECRET
    ? `${env.FB_APP_ID}|${env.FB_APP_SECRET}`
    : (env.FB_PAGE_TOKEN || '');
  if (!accessToken) {
    return json({ error: 'Missing access token for oEmbed' }, 500);
  }
  fbUrl.searchParams.set('access_token', accessToken);

  let res;
  try {
    res = await fetch(fbUrl.toString());
  } catch (err) {
    console.error('FB oEmbed fetch error', err);
    return json({ error: 'FB oEmbed request failed' }, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `FB oEmbed ${res.status}`;
    return json({ error: msg }, res.status);
  }

  const html = data?.html || '';
  if (!html) {
    return json({ error: 'Empty html from oEmbed' }, 502);
  }

  const resp = json({ html });
  resp.headers.set('X-Route', 'oembed');
  return resp;
}

function collectPostMedia(post) {
  const media = [];
  const seen = new Set();

  const push = src => {
    if (typeof src === 'string' && src && !seen.has(src)) {
      seen.add(src);
      media.push({ src });
    }
  };

  if (post.full_picture) {
    push(post.full_picture);
  }

  if (Array.isArray(post.attachments?.data)) {
    for (const attachment of post.attachments.data) {
      extractAttachmentMedia(attachment, push);
    }
  }

  return media;
}

function extractAttachmentMedia(attachment, push) {
  if (!attachment) return;

  const candidates = [
    attachment.media?.image?.src,
    attachment.media?.thumbnail_src,
    attachment.media?.thumbnail_url,
    attachment.media?.preview_image_url,
    attachment.media?.src,
    attachment.media?.source,
    attachment.unshimmed_url,
    attachment.url,
    attachment.target?.url
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.startsWith('http')) {
      push(candidate);
      break;
    }
  }

  if (Array.isArray(attachment.subattachments?.data)) {
    for (const sub of attachment.subattachments.data) {
      extractAttachmentMedia(sub, push);
    }
  }
}

async function handleGalleryList(request, env) {
  const files = collectGalleryFiles(env);
  return json({ items: files });
}

function collectGalleryFiles(env) {
  const entries = getManifestEntries(env);
  const seen = new Set();
  const files = [];

  for (const entry of entries) {
    if (typeof entry !== 'string') {
      continue;
    }
    const normalized = normalizeManifestEntry(entry);
    if (!normalized) {
      continue;
    }

    const lower = normalized.toLowerCase();
    if (!lower.startsWith('gallery/')) {
      continue;
    }

    const fileName = normalized.slice('gallery/'.length);
    if (!fileName || fileName.endsWith('/')) {
      continue;
    }

    const extension = `.${(fileName.split('.').pop() || '').toLowerCase()}`;
    if (!GALLERY_ALLOWED_EXTENSIONS.has(extension)) {
      continue;
    }

    const canonical = `gallery/${fileName}`;
    if (seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    files.push(canonical);
  }

  files.sort((a, b) => {
    const orderA = parseNumericPrefix(a);
    const orderB = parseNumericPrefix(b);
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.localeCompare(b, 'pl', { numeric: true, sensitivity: 'base' });
  });

  return files;
}

function getManifestEntries(env) {
  const entries = [];
  const manifests = new Set();

  if (env && typeof env.__STATIC_CONTENT_MANIFEST === 'string' && env.__STATIC_CONTENT_MANIFEST) {
    manifests.add(env.__STATIC_CONTENT_MANIFEST);
  }

  if (typeof __STATIC_CONTENT_MANIFEST !== 'undefined' && __STATIC_CONTENT_MANIFEST) {
    manifests.add(__STATIC_CONTENT_MANIFEST);
  }

  for (const raw of manifests) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          if (typeof value === 'string') {
            entries.push(value);
          } else if (value && typeof value === 'object') {
            if (typeof value.path === 'string') {
              entries.push(value.path);
            }
            if (typeof value.file === 'string') {
              entries.push(value.file);
            }
            if (typeof value.name === 'string') {
              entries.push(value.name);
            }
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        for (const key of Object.keys(parsed)) {
          entries.push(key);
        }
      } else if (typeof parsed === 'string') {
        entries.push(parsed);
      }
    } catch (err) {
      console.error('Static manifest parse error', err);
    }
  }

  return entries;
}

function normalizeManifestEntry(entry) {
  if (typeof entry !== 'string') {
    return '';
  }

  let candidate = entry.trim();
  if (!candidate) {
    return '';
  }

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      candidate = url.pathname || candidate;
    } catch (err) {
      console.error('Invalid manifest URL entry', candidate, err);
    }
  }

  const withoutQuery = candidate.split('?')[0].split('#')[0];
  let normalized = withoutQuery.replace(/^\.\/+/i, '').replace(/^\/+/, '');

  try {
    normalized = decodeURIComponent(normalized);
  } catch (err) {
    // Ignore decode errors, fall back to the raw value
  }

  return normalized;
}

function parseNumericPrefix(path) {
  const name = (path.split('/').pop() || '').trim();
  const match = name.match(/^(\d+)/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

