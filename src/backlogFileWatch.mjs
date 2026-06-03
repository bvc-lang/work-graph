import { watch } from 'node:fs';
import { join } from 'node:path';

/**
 * Debounced fs watch for intent tree `.work.bvc` changes.
 * @param {{ cwd: string, intentDir?: string, debounceMs?: number, onChange?: (detail: object) => void }} options
 */
export function createBacklogFileWatch(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const intentDir = options.intentDir ?? join(cwd, 'intent');
  const debounceMs = options.debounceMs ?? 150;
  const onChange = options.onChange ?? (() => undefined);

  /** @type {import('node:fs').FSWatcher | null} */
  let watcher = null;
  let debounceTimer = null;
  let started = false;

  function isWorkBvcPath(filename) {
    return String(filename ?? '').endsWith('.work.bvc');
  }

  function scheduleChange(detail) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      onChange(detail);
    }, debounceMs);
  }

  function attachWatcher(recursive) {
    watcher = watch(intentDir, recursive ? { recursive: true } : undefined, (eventType, filename) => {
      if (!isWorkBvcPath(filename)) {
        return;
      }
      scheduleChange({ eventType, filename, intentDir });
    });
    watcher.on('error', () => undefined);
  }

  function start() {
    if (started) {
      return;
    }
    started = true;
    try {
      attachWatcher(true);
    } catch {
      attachWatcher(false);
    }
  }

  function stop() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    started = false;
  }

  return { start, stop, intentDir };
}
