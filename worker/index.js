const ALLOWED_ORIGIN = 'https://exploride.pl';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/ig/media') {
        return await handleIgMedia(url, env);
      }
      if (path === '/api/fb/posts') {
        return await handleFbPosts(url, env);
      }

      return withCors(json({ error: 'Not found' }, { status: 404 }));
    } catch (err) {
      console.error('Worker error', err);
      return withCors(json({ error: 'Internal error' }, { status: 500 }));
    }
  }
};

function handleOptions() {
  const resp = new Response(null, { status: 204 });
  resp.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  resp.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  resp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  resp.headers.set('Access-Control-Max-Age', '86400');
  resp.headers.set('Vary', 'Origin');
  return resp;
}

async function handleIgMedia(url, env) {
  const pageId = url.searchParams.get('page_id');
  const limitParam = parseInt(url.searchParams.get('limit') || '9', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 9;
  const token = env.FB_PAGE_TOKEN;

  if (!pageId || !token) {
    return withCors(json({ items: [] }));
  }

  const igId = await getIgUserId(pageId, token);
  if (!igId) {
    return withCors(json({ items: [] }));
  }

  const out = await getIgMedia(igId, token, limit);
  return withCors(json(out));
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

async function handleFbPosts(url, env) {
  const pageId = url.searchParams.get('page_id');
  const limitParam = parseInt(url.searchParams.get('limit') || '6', 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 6;
  const token = env.FB_PAGE_TOKEN;

  if (!pageId || !token) {
    return withCors(json({ items: [] }));
  }

  const items = await getFbPosts(pageId, token, limit);
  return withCors(json({ items }));
}

async function getFbPosts(pageId, token, limit) {
  const u = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/posts`);
  u.searchParams.set(
    'fields',
    'id,message,permalink_url,created_time,full_picture,attachments{media_type,media,subattachments{media}}'
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

  const items = Array.isArray(data.data)
    ? data.data.map(post => ({
        id: post.id,
        message: post.message || '',
        permalink_url: post.permalink_url || '',
        created_time: post.created_time || '',
        media: collectPostMedia(post)
      }))
    : [];

  items.sort((a, b) => {
    const ta = a.created_time ? Date.parse(a.created_time) : 0;
    const tb = b.created_time ? Date.parse(b.created_time) : 0;
    return (tb || 0) - (ta || 0);
  });

  return items.slice(0, limit);
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

const json = (obj, init = {}) => {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(obj), { ...init, headers });
};

function withCors(resp) {
  resp.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  resp.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  resp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  resp.headers.set('Vary', 'Origin');
  return resp;
}
