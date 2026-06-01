/**
 * PVRG language adapter stub for Blade templates (AN-21 P2).
 * Registers *.blade.php as traceable UI artifacts alongside PHP/docs.
 */
export const BLADE_ADAPTER_ID = 'blade';

/**
 * @param {string} filePath
 * @returns {boolean}
 */
export function isBladeFile(filePath) {
  return String(filePath ?? '').toLowerCase().endsWith('.blade.php');
}

/**
 * Extract x-ui component tags for lightweight trace edges.
 * @param {string} source
 * @returns {string[]}
 */
export function extractBladeUiComponentRefs(source) {
  const refs = new Set();
  const pattern = /<x-ui\.([a-z0-9_.-]+)/gi;
  let match = pattern.exec(source);
  while (match) {
    refs.add(`x-ui.${match[1]}`);
    match = pattern.exec(source);
  }
  return [...refs];
}

/**
 * @param {{ filePath: string, content: string }} file
 */
export function parseBladeFileForPvrg(file) {
  return {
    adapter: BLADE_ADAPTER_ID,
    path: file.filePath,
    uiComponentRefs: extractBladeUiComponentRefs(file.content ?? ''),
  };
}
