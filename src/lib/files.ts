// Pure filename / string helpers. No I/O, no Tauri deps.

const ILLEGAL_FS_CHARS = /[\\/:*?"<>|]/g;

/**
 * Make a user-entered topic name safe to use as a Windows folder name.
 * Collapses runs of whitespace, trims, and replaces illegal chars with `_`.
 */
export function sanitizeTopicName(name: string): string {
  return name
    .replace(ILLEGAL_FS_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A topic name is valid when it produces a non-empty, non-dot folder name
 *  that isn't the reserved `raw` used for materials. */
export function isValidTopicName(name: string): boolean {
  const clean = sanitizeTopicName(name);
  if (clean.length === 0) return false;
  if (/^[. ]+$/.test(clean)) return false;
  if (clean.toLowerCase() === 'raw') return false;
  return true;
}

/** Build a timestamped filename like `Clipboard-2026-07-19-153012.md`. */
export function clipboardFileName(ext: string, date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  return `Clipboard-${stamp}.${ext}`;
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** Basename of a posix-or-windows path. */
export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}
