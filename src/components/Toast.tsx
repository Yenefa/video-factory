// Fixed bottom-right toast stack. Click to dismiss. AnimatePresence enter/exit.

import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import type { ToastKind } from '../types';

const kindShell: Record<ToastKind, string> = {
  success: 'bg-surface border-line',
  error: 'bg-surface border-red-300/50',
  info: 'bg-surface border-line',
};

const kindDot: Record<ToastKind, string> = {
  success: 'bg-accent',
  error: 'bg-red-500',
  info: 'bg-ink-soft',
};

export function Toast() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            type="button"
            onClick={() => removeToast(t.id)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`pointer-events-auto flex max-w-[340px] items-center gap-2.5 rounded-subtle border px-3.5 py-2.5 text-left text-[13px] text-ink ${kindShell[t.kind]}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${kindDot[t.kind]}`} />
            <span className="leading-snug">{t.message}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
