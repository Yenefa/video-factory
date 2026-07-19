// Left sidebar: wordmark, New Topic button, topic list, settings + workspace footer.

import { motion, type Variants } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useTopics } from '../hooks/useTopics';
import { basename } from '../lib/files';
import { TopicItem } from './TopicItem';
import { IconButton } from './ui/IconButton';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
};

export function Sidebar() {
  const { topics } = useTopics();
  const workspaceRoot = useAppStore((s) => s.workspaceRoot);
  const openNewTopicDialog = useAppStore((s) => s.openNewTopicDialog);
  const openSettings = useAppStore((s) => s.openSettings);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
      <header className="px-5 pt-6 pb-4">
        <h1 className="font-serif text-xl leading-tight text-ink">Raw Material</h1>
        <p className="font-serif text-xl leading-tight text-ink">Collector</p>
        <p className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-ink-soft">
          Paper &amp; ink
        </p>
      </header>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={openNewTopicDialog}
          className="flex w-full items-center justify-center gap-2 rounded-subtle bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="text-base leading-none">+</span>
          New Topic
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2">
        {topics.length === 0 ? (
          <p className="px-3 py-6 text-[13px] text-ink-soft">No topics yet. Create one -&gt;</p>
        ) : (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-0.5"
          >
            {topics.map((t) => (
              <motion.li key={t.path} variants={itemVariants}>
                <TopicItem topic={t} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </nav>

      <footer className="border-t border-line px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-ink-soft" title={workspaceRoot}>
            {basename(workspaceRoot) || workspaceRoot}
          </span>
          <IconButton aria-label="Open settings" onClick={openSettings}>
            <GearIcon />
          </IconButton>
        </div>
      </footer>
    </aside>
  );
}

function GearIcon() {
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
