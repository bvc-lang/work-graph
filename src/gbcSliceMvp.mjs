import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const GBC_SLICE_MVP_SCHEMA = 'gbc.slice.mvp.v1';

export function buildLinkageMetricsSlice(linkage = {}, options = {}) {
  const workId = String(options.workId ?? '').trim() || null;
  const links = Array.isArray(linkage.links) ? linkage.links : [];

  return {
    schema: GBC_SLICE_MVP_SCHEMA,
    workId,
    generatedAt: new Date().toISOString(),
    metrics: {
      linkCount: links.length,
      workNodes: new Set(
        links.flatMap((link) => [link.sourceWorkId, link.from?.id, link.to?.id].filter(Boolean)),
      ).size,
      fileRefs: links.filter((link) => link.to?.kind === 'file' || link.from?.kind === 'file').length,
    },
    links: links.slice(0, options.maxLinks ?? 128),
  };
}

export async function writeGbcSliceJson(slice, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const outputPath = resolve(cwd, options.outputPath ?? '.iohasc/cache/linkage-metrics-slice.v1.json');
  await mkdir(dirname(outputPath), { recursive: true });
  const text = `${JSON.stringify(slice, null, 2)}\n`;
  await writeFile(outputPath, text, 'utf8');
  return { outputPath, bytes: Buffer.byteLength(text, 'utf8') };
}

export async function readGbcSliceJson(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const inputPath = resolve(cwd, options.inputPath ?? '.iohasc/cache/linkage-metrics-slice.v1.json');
  const text = options.sliceText ?? await readFile(inputPath, 'utf8');
  return JSON.parse(text);
}

export async function roundTripGbcSlice(linkage, options = {}) {
  const slice = buildLinkageMetricsSlice(linkage, options);
  const written = await writeGbcSliceJson(slice, options);
  const loaded = await readGbcSliceJson({ ...options, inputPath: written.outputPath });
  return { slice, written, loaded, ok: loaded.schema === GBC_SLICE_MVP_SCHEMA };
}
