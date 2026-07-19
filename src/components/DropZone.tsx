// Large dashed drop target panel. Visualizes the global drag state passed from App.

import { motion } from 'framer-motion';

interface DropZoneProps {
  isDragging: boolean;
}

export function DropZone({ isDragging }: DropZoneProps) {
  return (
    <motion.div
      className={`flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors duration-200 ${
        isDragging ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
      }`}
      animate={{ scale: isDragging ? 1.005 : 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-center gap-3 px-8 text-center">
        <motion.span
          animate={{ scale: isDragging ? 1.08 : 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`flex h-12 w-12 items-center justify-center rounded-full border border-dashed ${
            isDragging ? 'border-accent text-accent' : 'border-line text-ink-soft'
          }`}
        >
          <PlusIcon />
        </motion.span>
        <p className="font-serif text-2xl text-ink">Drop anything here.</p>
        <p className="text-[13px] text-ink-soft">
          Or paste with Ctrl+V · Markdown, PDF, Word, TXT, HTML, images, anything
        </p>
      </div>
    </motion.div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
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
