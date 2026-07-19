// Right-side settings drawer. Workspace picker, theme segmented control, about.

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../store/useAppStore';
import type { Theme } from '../types';
import { IconButton } from './ui/IconButton';

export function SettingsPanel() {
  const isOpen = useAppStore((s) => s.settingsOpen);
  const closeSettings = useAppStore((s) => s.closeSettings);
  const workspaceRoot = useAppStore((s) => s.workspaceRoot);
  const setWorkspaceRoot = useAppStore((s) => s.setWorkspaceRoot);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSettings();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeSettings]);

  async function pickFolder() {
    try {
      const dir = await openDialog({ directory: true, multiple: false });
      if (typeof dir === 'string') {
        await setWorkspaceRoot(dir);
      }
    } catch {
      // user cancelled - no action needed
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={closeSettings}
        >
          <motion.div
            className="flex h-full w-[380px] max-w-[90vw] flex-col border-l border-line bg-surface"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="font-serif text-2xl text-ink">Settings</h2>
              <IconButton aria-label="Close settings" onClick={closeSettings}>
                <CloseIcon />
              </IconButton>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <Section title="Workspace">
                <p className="truncate text-[13px] text-ink" title={workspaceRoot}>
                  {workspaceRoot}
                </p>
                <button
                  type="button"
                  onClick={() => void pickFolder()}
                  className="mt-2 inline-flex h-8 items-center rounded-subtle border border-line px-3 text-[13px] text-ink-soft transition-colors hover:bg-accent-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Change…
                </button>
              </Section>

              <Section title="Theme">
                <div className="flex gap-1 rounded-subtle border border-line p-0.5">
                  {(['light', 'dark', 'system'] as Theme[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => void setTheme(opt)}
                      className={`flex-1 rounded-subtle px-3 py-1.5 text-[12px] capitalize transition-colors focus:outline-none ${
                        theme === opt ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="About">
                <p className="text-[12px] leading-relaxed text-ink-soft">
                  Raw Material Collector · v0.1.0
                  <br />
                  Materials stored locally. Nothing is uploaded.
                </p>
              </Section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft">
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
