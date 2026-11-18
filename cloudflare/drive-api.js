// Public APML Drive metadata API backed by Cloudflare D1.
// Cloudinary continues to store the actual file assets.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const cleanName = (value) => String(value ?? '').trim().replace(/[\x00-\x1f\x7f]/g, '');
const now = () => Date.now();

function mapFolder(row) {
  return {
    key: row.id,
    name: row.name,
    parentId: row.parent_id || 'root',
    prevParentId: row.previous_parent_id || null,
    timestamp: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    deletedAt: row.deleted_at == null ? null : Number(row.deleted_at),
  };
}

function mapFile(row) {
  return {
    key: row.id,
    fileId: row.file_url || '',
    parentId: row.parent_id || 'root',
    prevParentId: row.previous_parent_id || null,
    name: row.name,
    size: Number(row.size) || 0,
    source: row.source || '',
    timestamp: Number(row.created_at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    deletedAt: row.deleted_at == null ? null : Number(row.deleted_at),
  };
}

async function readBody(request) {
  const raw = await request.text();
  if (raw.length > 12_000) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw Object.assign(new Error('A valid JSON object is required.'), { status: 400 });
  }
}

async function enforceWriteLimit(request, env) {
  // Basic per-IP abuse protection. This is deliberately separate from authentication:
  // the shared Drive is public-editable by design.
  if (!env.ANNOUNCE_KV) return;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = 'drive:write-limit:' + ip.slice(0, 80);
  const current = Number(await env.ANNOUNCE_KV.get(key)) || 0;
  if (current >= 30) throw Object.assign(new Error('Too many Drive changes. Please wait a minute and try again.'), { status: 429 });
  await env.ANNOUNCE_KV.put(key, String(current + 1), { expirationTtl: 60 });
}

async function requireParent(db, parentId) {
  if (parentId === 'root' || parentId === 'deleted') return;
  const row = await db.prepare('SELECT id FROM drive_folders WHERE id = ?').bind(parentId).first();
  if (!row) throw Object.assign(new Error('The destination folder does not exist.'), { status: 400 });
}

async function checkFolderMove(db, id, parentId) {
  if (id === parentId) throw Object.assign(new Error('A folder cannot be moved inside itself.'), { status: 400 });
  if (parentId === 'root' || parentId === 'deleted') return;
  const row = await db.prepare(`
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM drive_folders WHERE parent_id = ?
      UNION ALL
      SELECT f.id FROM drive_folders f JOIN descendants d ON f.parent_id = d.id
    )
    SELECT id FROM descendants WHERE id = ? LIMIT 1
  `).bind(id, parentId).first();
  if (row) throw Object.assign(new Error('A folder cannot be moved inside one of its own subfolders.'), { status: 400 });
}

async function handleGet(url, env) {
  const db = env.DB;
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured.' }, 503);
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/drive/folders') {
    const result = await db.prepare('SELECT * FROM drive_folders ORDER BY name COLLATE NOCASE').all();
    return json({ ok: true, folders: (result.results || []).map(mapFolder) });
  }
  if (path === '/drive/files') {
    const result = await db.prepare('SELECT * FROM drive_files ORDER BY created_at DESC').all();
    return json({ ok: true, files: (result.results || []).map(mapFile) });
  }
  if (path === '/drive' || path === '/drive/') {
    const [folders, files] = await Promise.all([
      db.prepare('SELECT * FROM drive_folders ORDER BY name COLLATE NOCASE').all(),
      db.prepare('SELECT * FROM drive_files ORDER BY created_at DESC').all(),
    ]);
    return json({
      ok: true,
      folders: (folders.results || []).map(mapFolder),
      files: (files.results || []).map(mapFile),
    });
  }
  return json({ ok: false, error: 'Drive endpoint not found.' }, 404);
}

async function handleCreate(request, env, kind) {
  const db = env.DB;
  const body = await readBody(request);
  await enforceWriteLimit(request, env);
  const id = String(body.id || crypto.randomUUID()).slice(0, 128);
  const name = cleanName(body.name);
  const parentId = String(body.parentId || 'root').slice(0, 128);
  const timestamp = Number.isFinite(Number(body.timestamp)) && Number(body.timestamp) > 0 ? Number(body.timestamp) : now();
  if (!name || name.length > 180) return json({ ok: false, error: 'Name must contain 1–180 characters.' }, 400);
  if (id === 'root' || id === 'deleted') return json({ ok: false, error: 'This ID is reserved.' }, 400);
  await requireParent(db, parentId);
  if (parentId === 'deleted') return json({ ok: false, error: 'New items cannot be created directly in Trash.' }, 400);

  if (kind === 'folders') {
    await db.prepare(`
      INSERT INTO drive_folders (id, name, parent_id, created_at, updated_at, previous_parent_id, deleted_at)
      VALUES (?, ?, ?, ?, ?, NULL, NULL)
    `).bind(id, name, parentId, timestamp, timestamp).run();
    return json({ ok: true, item: { key: id, name, parentId, timestamp, prevParentId: null, deletedAt: null } }, 201);
  }

  const fileUrl = String(body.fileId || body.file_url || '').trim();
  let parsed;
  try { parsed = new URL(fileUrl); } catch { return json({ ok: false, error: 'A valid file URL is required.' }, 400); }
  if (!['http:', 'https:'].includes(parsed.protocol) || fileUrl.length > 2048) {
    return json({ ok: false, error: 'Only valid HTTP or HTTPS file URLs are accepted.' }, 400);
  }
  const size = Number(body.size) || 0;
  if (!Number.isFinite(size) || size < 0 || size > 100 * 1024 * 1024) {
    return json({ ok: false, error: 'File size must be between 0 and 100 MB.' }, 400);
  }
  const source = String(body.source || '').slice(0, 32);
  await db.prepare(`
    INSERT INTO drive_files
      (id, name, parent_id, previous_parent_id, file_url, size, source, created_at, updated_at, deleted_at)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL)
  `).bind(id, name, parentId, fileUrl, Math.floor(size), source, timestamp, timestamp).run();
  return json({ ok: true, item: { key: id, fileId: fileUrl, name, parentId, size: Math.floor(size), source, timestamp, prevParentId: null, deletedAt: null } }, 201);
}

async function handleUpdate(request, env, kind, id) {
  const db = env.DB;
  const body = await readBody(request);
  await enforceWriteLimit(request, env);
  if (!id || id === 'root' || id === 'deleted') return json({ ok: false, error: 'Invalid item ID.' }, 400);
  const table = kind === 'folders' ? 'drive_folders' : 'drive_files';
  const existing = await db.prepare('SELECT * FROM ' + table + ' WHERE id = ?').bind(id).first();
  if (!existing) return json({ ok: false, error: 'Item not found.' }, 404);

  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    const name = cleanName(body.name);
    if (!name || name.length > 180) return json({ ok: false, error: 'Name must contain 1–180 characters.' }, 400);
    updates.name = name;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'parentId')) {
    const parentId = String(body.parentId || 'root').slice(0, 128);
    await requireParent(db, parentId);
    if (parentId === 'deleted') {
      updates.previous_parent_id = body.prevParentId || existing.parent_id || 'root';
      updates.deleted_at = Number(body.deletedAt) || now();
    } else {
      if (kind === 'folders') await checkFolderMove(db, id, parentId);
      updates.previous_parent_id = null;
      updates.deleted_at = null;
    }
    updates.parent_id = parentId;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'prevParentId')) {
    updates.previous_parent_id = body.prevParentId ? String(body.prevParentId).slice(0, 128) : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'deletedAt')) {
    updates.deleted_at = body.deletedAt == null ? null : Number(body.deletedAt);
  }
  if (!Object.keys(updates).length) return json({ ok: true, item: kind === 'folders' ? mapFolder(existing) : mapFile(existing) });

  updates.updated_at = now();
  const columns = Object.keys(updates);
  const assignments = columns.map(column => column + ' = ?').join(', ');
  await db.prepare('UPDATE ' + table + ' SET ' + assignments + ' WHERE id = ?')
    .bind(...columns.map(column => updates[column]), id).run();
  const updated = await db.prepare('SELECT * FROM ' + table + ' WHERE id = ?').bind(id).first();
  return json({ ok: true, item: kind === 'folders' ? mapFolder(updated) : mapFile(updated) });
}

async function handleDelete(request, env, kind, id) {
  const db = env.DB;
  await enforceWriteLimit(request, env);
  if (!id || id === 'root' || id === 'deleted') return json({ ok: false, error: 'This item cannot be deleted.' }, 400);
  if (kind === 'files') {
    const result = await db.prepare('DELETE FROM drive_files WHERE id = ?').bind(id).run();
    if (!result.meta?.changes) return json({ ok: false, error: 'File not found.' }, 404);
    // Metadata deletion intentionally does not remove the Cloudinary asset.
    return json({ ok: true, cloudinaryAssetPreserved: true });
  }
  const exists = await db.prepare('SELECT id FROM drive_folders WHERE id = ?').bind(id).first();
  if (!exists) return json({ ok: false, error: 'Folder not found.' }, 404);
  await db.batch([
    db.prepare(`
      DELETE FROM drive_files
      WHERE parent_id IN (
        WITH RECURSIVE tree(id) AS (
          SELECT ? UNION ALL SELECT f.id FROM drive_folders f JOIN tree t ON f.parent_id = t.id
        ) SELECT id FROM tree
      )
    `).bind(id),
    db.prepare(`
      DELETE FROM drive_folders
      WHERE id IN (
        WITH RECURSIVE tree(id) AS (
          SELECT ? UNION ALL SELECT f.id FROM drive_folders f JOIN tree t ON f.parent_id = t.id
        ) SELECT id FROM tree
      )
    `).bind(id),
  ]);
  return json({ ok: true, descendantsRemoved: true, cloudinaryAssetsPreserved: true });
}

export async function handleDriveApi(request, env) {
  if (!env.DB) return json({ ok: false, error: 'D1 binding DB is not configured.' }, 503);
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/'
  if (request.method === 'GET') return handleGet(url, env);
  const match = path.match(/^\/drive\/(folders|files)(?:\/([^/]+))?$/);
  if (!match) return json({ ok: false, error: 'Drive endpoint not found.' }, 404);
  const kind = match[1];
  const id = match[2] ? decodeURIComponent(match[2]) : null;
  try {
    if (request.method === 'POST' && !id) return await handleCreate(request, env, kind);
    if (request.method === 'PATCH' && id) return await handleUpdate(request, env, kind, id);
    if (request.method === 'DELETE' && id) return await handleDelete(request, env, kind, id);
    return json({ ok: false, error: 'Method not allowed.' }, 405);
  } catch (error) {
    console.error('APML Drive API error:', error);
    return json({ ok: false, error: error.message || 'Drive request failed.' }, error.status || 500);
  }
}
