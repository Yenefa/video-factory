// A single topic row in the sidebar. Active highlight, quick-drop lock, and a
// hover-revealed delete trigger that opens a confirmation dialog.

import { useAppStore } from '../store/useAppStore';
import type { TopicInfo } from '../types';

interface TopicItemProps {
  topic: TopicInfo;
}

export function TopicItem({ topic }: TopicItemProps) {
  const currentTopicPath = useAppStore((s) => s.currentTopicPath);
  const selectTopic = useAppStore((s) => s.selectTopic);
  const quickDropEnabled = useAppStore((s) => s.quickDropEnabled);
  const quickDropTopicPath = useAppStore((s) => s.quickDropTopicPath);
  const enableQuickDrop = useAppStore((s) => s.enableQuickDrop);
  const openDeleteTopicDialog = useAppStore((s) => s.openDeleteTopicDialog);

  const active = topic.path === currentTopicPath;
  const locked = quickDropEnabled && quickDropTopicPath === topic.path;

  return (
    <div
      className={`group relative flex items-center rounded-subtle transition-colors duration-150 ${
        active ? 'bg-accent-soft text-ink' : 'text-ink hover:bg-accent-soft'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
      )}
      <button
        type="button"
        onClick={() => void selectTopic(topic.path)}
        className="min-w-0 flex-1 truncate py-1.5 pl-3 pr-2 text-left text-[13px]"
        title={topic.name}
      >
        {topic.name}
      </button>
      <button
        type="button"
        onClick={() => void enableQuickDrop(topic.path)}
        aria-label={
          locked ? `Quick Drop locked to ${topic.name}` : `Lock Quick Drop to ${topic.name}`
        }
        title={locked ? 'Quick Drop locked' : 'Lock Quick Drop to this topic'}
        className={`mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-subtle transition-opacity ${
          locked
            ? 'text-accent opacity-100'
            : 'text-ink-soft opacity-0 group-hover:opacity-100 hover:text-ink'
        }`}
      >
        <LockIcon locked={locked} />
      </button>
      <button
        type="button"
        onClick={() => openDeleteTopicDialog(topic)}
        aria-label={`Delete topic ${topic.name}`}
        title="Delete topic"
        className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-subtle text-ink-soft opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-red-600"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d={locked ? 'M7 11V7a5 5 0 0 1 10 0v4' : 'M7 11V7a5 5 0 0 1 9-3'} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
