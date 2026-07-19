// Centered empty workspace. Two modes: no topics at all, or none selected.

import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useTopics } from '../hooks/useTopics';

export function EmptyState() {
  const { topics } = useTopics();
  const openNewTopicDialog = useAppStore((s) => s.openNewTopicDialog);

  if (topics.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <motion.button
          type="button"
          onClick={openNewTopicDialog}
          aria-label="Create your first topic"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PlusIcon />
        </motion.button>
        <h2 className="mt-6 font-serif text-3xl text-ink">Create your first topic</h2>
        <p className="mt-2 text-[13px] text-ink-soft">A topic is one video project or series.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <h2 className="font-serif text-3xl text-ink">Select a topic</h2>
      <p className="mt-2 text-[13px] text-ink-soft">
        Pick one from the sidebar to start collecting.
      </p>
      <motion.div
        className="mt-6 text-ink-soft"
        animate={{ x: [-4, 0, -4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ArrowLeftIcon />
      </motion.div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
