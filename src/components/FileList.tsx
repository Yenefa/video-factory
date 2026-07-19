// Compact, read-only file list for the current topic's raw folder.
// Lists both files and directories. Each row carries an expanding Delete
// button that fades in on row hover.

import { useAppStore } from '../store/useAppStore';
import { useTopics } from '../hooks/useTopics';
import { openInExplorer } from '../lib/fs';
import { formatBytes, fileExtension } from '../lib/files';
import { IconButton } from './ui/IconButton';
import { DeleteButton } from './ui/DeleteButton';

export function FileList() {
  const { current } = useTopics();
  const files = useAppStore((s) => s.files);
  const filesLoading = useAppStore((s) => s.filesLoading);
  const deleteFile = useAppStore((s) => s.deleteFile);

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
          Collected · {files.length}
        </h3>
        {current && (
          <IconButton
            aria-label="Open topic folder"
            onClick={() => void openInExplorer(current.path)}
            className="h-7 w-7"
          >
            <FolderIcon />
          </IconButton>
        )}
      </div>

      <div className="max-h-[220px] min-h-[80px] overflow-y-auto">
        {filesLoading ? (
          <div className="space-y-1.5 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-subtle bg-accent-soft" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-ink-soft">
            Nothing collected yet. Drop files or paste.
          </p>
        ) : (
          <ul className="py-1">
            {files.map((f) => {
              const ext = (fileExtension(f.name).slice(0, 3) || '·').toUpperCase();
              return (
                <li
                  key={f.path}
                  className="group flex items-center gap-3 px-4 py-1.5 transition-colors hover:bg-accent-soft"
                >
                  <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-subtle bg-accent-soft text-[10px] font-semibold text-accent">
                    {f.isDir ? <FolderMiniIcon /> : ext}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink" title={f.name}>
                    {f.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-soft">
                    {f.isDir ? '—' : formatBytes(f.size)}
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-ink-soft sm:inline">
                    {new Date(f.modifiedAt).toLocaleDateString()}{' '}
                    {new Date(f.modifiedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex w-8 shrink-0 items-center justify-end overflow-visible opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <DeleteButton
                      size="sm"
                      aria-label={`Delete ${f.name}`}
                      title="Delete"
                      onClick={() => void deleteFile(f.name)}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function FolderMiniIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
