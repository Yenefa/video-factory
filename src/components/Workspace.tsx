// Main content area. Header (topic name + Quick Drop toggle + open folder),
// Quick Drop banner when active, DropZone filling space, FileList below.

import { useAppStore } from '../store/useAppStore';
import { useTopics } from '../hooks/useTopics';
import { openInExplorer } from '../lib/fs';
import { DropZone } from './DropZone';
import { EmptyState } from './EmptyState';
import { FileList } from './FileList';
import { QuickDropToggle } from './QuickDropToggle';
import { IconButton } from './ui/IconButton';

interface WorkspaceProps {
  isDragging: boolean;
}

export function Workspace({ isDragging }: WorkspaceProps) {
  const { current, topics } = useTopics();
  const quickDropEnabled = useAppStore((s) => s.quickDropEnabled);
  const quickDropTopicPath = useAppStore((s) => s.quickDropTopicPath);

  const quickDropTopic = quickDropTopicPath
    ? topics.find((t) => t.path === quickDropTopicPath) ?? null
    : null;

  if (!current) {
    return <EmptyState />;
  }

  return (
    <div className="flex h-full flex-col">
      {quickDropEnabled && quickDropTopic && (
        <div className="border-b border-line bg-accent-soft px-8 py-2 text-[12px] text-ink">
          Quick Drop is ON -&gt; drops &amp; pastes go to{' '}
          <span className="font-medium text-accent">{quickDropTopic.name}</span>
        </div>
      )}

      <header className="flex items-center justify-between px-8 pt-8 pb-5">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-3xl leading-tight text-ink">{current.name}</h2>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft">{current.path}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <QuickDropToggle />
          <IconButton
            aria-label="Open topic folder"
            onClick={() => void openInExplorer(current.path)}
          >
            <FolderIcon />
          </IconButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 pb-8">
        <div className="min-h-0 flex-1">
          <DropZone isDragging={isDragging} />
        </div>
        <div className="shrink-0">
          <FileList />
        </div>
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      width="16"
      height="16"
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
