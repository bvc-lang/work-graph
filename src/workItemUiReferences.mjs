import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import {
  applyAtomInspectorProposalToBacklogFile,
  importStepAtomDraftForWorkItem,
} from './atomInspector.mjs';
import { readWorkItemAtomFromRepo, readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
export const UI_REFERENCES_MANIFEST_SCHEMA = 'workitem.ui-references.v1';
export const DEFAULT_UI_REFERENCES_DIR = 'work/ui-references';
export const UI_REFERENCE_MAX_BYTES = 5 * 1024 * 1024;
export const UI_REFERENCE_ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function isUiFacingWorkItem(item) {
  if (!item) {
    return false;
  }

  if (String(item.labels?.['work.ui_task'] ?? '').trim().toLowerCase() === 'true') {
    return true;
  }

  const haystack = [
    item.title,
    item.basis,
    item.vector,
    item.goal,
    item.department,
    item.ownerRole,
    ...(item.targetFiles ?? []),
  ].join('\n');

  if (/dashboard|operator|интерфейс|экран|макет|wireframe|figma|скрин|ui panel|ui task|ui-dashboard|backlog ui|ui server|ui-refs|ui refs/iu.test(haystack)) {
    return true;
  }

  if (String(item.department ?? '').toLowerCase().includes('ui')) {
    return true;
  }

  return (item.targetFiles ?? []).some((path) =>
    /BacklogUi|dashboard|\.css|\.html|operator|panel|view/i.test(path),
  );
}

export function resolveUiReferencesDir(cwd, workId, rootDir = DEFAULT_UI_REFERENCES_DIR) {
  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '' || normalizedWorkId.includes('..') || normalizedWorkId.includes('/')) {
    throw new Error('invalid workId for ui references');
  }

  return resolve(cwd, rootDir, normalizedWorkId);
}

export function manifestPathForWorkItem(cwd, workId, rootDir = DEFAULT_UI_REFERENCES_DIR) {
  return join(resolveUiReferencesDir(cwd, workId, rootDir), 'manifest.v1.json');
}

export function emptyUiReferencesManifest(workId) {
  return {
    schema: UI_REFERENCES_MANIFEST_SCHEMA,
    workId,
    items: [],
  };
}

export async function readUiReferencesManifest(cwd, workId, rootDir = DEFAULT_UI_REFERENCES_DIR) {
  const path = manifestPathForWorkItem(cwd, workId, rootDir);

  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.schema !== UI_REFERENCES_MANIFEST_SCHEMA || !Array.isArray(parsed.items)) {
      return emptyUiReferencesManifest(workId);
    }

    return {
      ...parsed,
      workId,
      items: parsed.items.sort((left, right) => compareText(left.file ?? '', right.file ?? '')),
    };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return emptyUiReferencesManifest(workId);
    }

    throw error;
  }
}

async function writeUiReferencesManifest(cwd, workId, manifest, rootDir = DEFAULT_UI_REFERENCES_DIR) {
  const path = manifestPathForWorkItem(cwd, workId, rootDir);
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
  return path;
}

export function validateUiReferenceUpload({ filename, buffer }) {
  const name = String(filename ?? '').trim();
  if (name === '' || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return { ok: false, error: 'invalid_filename' };
  }

  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (!UI_REFERENCE_ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'unsupported_image_type' };
  }

  const bytes = buffer instanceof Buffer ? buffer : Buffer.from(buffer ?? []);
  if (bytes.length === 0) {
    return { ok: false, error: 'empty_file' };
  }

  if (bytes.length > UI_REFERENCE_MAX_BYTES) {
    return { ok: false, error: 'file_too_large' };
  }

  return { ok: true, filename: name, buffer: bytes, ext };
}

function stableReferenceFileName(originalName, buffer) {
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const stem = originalName.slice(0, originalName.lastIndexOf('.')).replace(/[^a-zA-Z0-9._-]+/gu, '-').slice(0, 40);
  return `${stem || 'ref'}-${hash}${ext}`;
}

export async function syncUiRefsLabelOnWorkItemAtom(workId, manifest, options = {}) {
  const paths = manifest.items.map((entry) =>
    join(DEFAULT_UI_REFERENCES_DIR, workId, entry.file).replace(/\\/g, '/'),
  );

  const sourceAtom = await readWorkItemAtomFromRepo(workId, options);
  const source = importStepAtomDraftForWorkItem(sourceAtom.atomText, workId);
  const draft = {
    ...source.draft,
    labels: {
      ...(source.draft.labels ?? {}),
      'work.ui_refs': paths.join(', '),
      'work.ui_refs.count': String(paths.length),
    },
  };

  if (paths.length > 0) {
    draft.uiRefs = manifest.items.map((entry) =>
      `${entry.file}${entry.caption ? ` | ${entry.caption}` : ''}`,
    );
  }

  return applyAtomInspectorProposalToBacklogFile({
    ...options,
    workId,
    draft,
  });
}

export async function attachUiReference(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const workId = String(options.workId ?? '').trim();
  if (workId === '') {
    return { ok: false, error: 'work_id_required' };
  }

  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const item = items.find((entry) => entry.id === workId);
  if (!item) {
    return { ok: false, error: 'work_item_not_found', workId };
  }

  if (!isUiFacingWorkItem(item) && options.force !== true) {
    return { ok: false, error: 'not_ui_facing_task', workId, hint: 'Set work.ui_task: true to allow refs on non-UI tasks' };
  }

  let buffer = options.buffer;
  if (options.contentBase64 !== undefined) {
    buffer = Buffer.from(String(options.contentBase64), 'base64');
  }

  const validated = validateUiReferenceUpload({ filename: options.filename, buffer });
  if (!validated.ok) {
    return { ok: false, error: validated.error, workId };
  }

  const storedName = stableReferenceFileName(validated.filename, validated.buffer);
  const dir = resolveUiReferencesDir(cwd, workId, options.rootDir);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, storedName);
  await writeFile(filePath, validated.buffer);

  const manifest = await readUiReferencesManifest(cwd, workId, options.rootDir);
  const entry = {
    file: storedName,
    caption: String(options.caption ?? '').trim(),
    uploadedAt: options.uploadedAt ?? new Date().toISOString(),
    originalName: validated.filename,
    bytes: validated.buffer.length,
    mime: mimeForExt(validated.ext),
  };

  manifest.items = [...manifest.items.filter((candidate) => candidate.file !== storedName), entry]
    .sort((left, right) => compareText(left.file, right.file));

  await writeUiReferencesManifest(cwd, workId, manifest, options.rootDir);
  const labelSync = await syncUiRefsLabelOnWorkItemAtom(workId, manifest, { ...options, cwd });

  return {
    ok: true,
    workId,
    entry,
    relativePath: join(DEFAULT_UI_REFERENCES_DIR, workId, storedName).replace(/\\/g, '/'),
    manifest,
    labelSyncOk: labelSync.ok === true,
  };
}

export async function listUiReferences(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const workId = String(options.workId ?? '').trim();
  if (workId === '') {
    return { ok: false, error: 'work_id_required' };
  }

  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const item = items.find((entry) => entry.id === workId) ?? null;
  const manifest = await readUiReferencesManifest(cwd, workId, options.rootDir);

  return {
    ok: true,
    schema: UI_REFERENCES_MANIFEST_SCHEMA,
    workId,
    uiFacing: item ? isUiFacingWorkItem(item) : false,
    items: manifest.items.map((entry) => ({
      ...entry,
      url: `/api/work-item/ui-refs/file?workId=${encodeURIComponent(workId)}&file=${encodeURIComponent(entry.file)}`,
    })),
  };
}

export function resolveUiReferenceFilePath(cwd, workId, fileName, rootDir = DEFAULT_UI_REFERENCES_DIR) {
  const normalizedFile = String(fileName ?? '').trim();
  if (normalizedFile === '' || normalizedFile.includes('..') || normalizedFile.includes('/') || normalizedFile.includes('\\')) {
    throw new Error('invalid ui reference file name');
  }

  return join(resolveUiReferencesDir(cwd, workId, rootDir), normalizedFile);
}

function mimeForExt(ext) {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

export function mimeTypeForUiReferenceFileName(fileName) {
  const ext = String(fileName ?? '').slice(String(fileName).lastIndexOf('.')).toLowerCase();
  return mimeForExt(ext);
}
