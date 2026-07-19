// App shell: hydrate, theme effect, global paste + drag-drop wiring, layout.

import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useDragDrop } from './hooks/useDragDrop';
import { usePaste } from './hooks/usePaste';
import type { Theme } from './types';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { NewTopicDialog } from './components/NewTopicDialog';
import { DeleteTopicDialog } from './components/DeleteTopicDialog';
import { SettingsPanel } from './components/SettingsPanel';
import { Toast } from './components/Toast';

function useThemeEffect(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement;
    function apply(dark: boolean) {
      if (dark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    apply(theme === 'dark');
  }, [theme]);
}

export default function App() {
  const hydrated = useAppStore((s) => s.hydrated);
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    void useAppStore.getState().hydrate();
  }, []);

  useThemeEffect(theme);
  usePaste();
  const { isDragging } = useDragDrop((paths) => {
    void useAppStore.getState().ingestFiles(paths);
  });

  if (!hydrated) {
    return (
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="font-serif text-2xl text-ink-soft opacity-60">Raw Material Collector</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-full">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <Workspace isDragging={isDragging} />
      </main>
      <NewTopicDialog />
      <DeleteTopicDialog />
      <SettingsPanel />
      <Toast />
    </div>
  );
}
