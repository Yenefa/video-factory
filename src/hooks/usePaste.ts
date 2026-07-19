// Global Ctrl+V handler. Reads the clipboard and routes content into the
// current (or Quick Drop) topic. Ignored while an input/textarea is focused
// so normal text editing still works.

import { useEffect } from 'react';
import { readImage, readText } from '@tauri-apps/plugin-clipboard-manager';
import { useAppStore } from '../store/useAppStore';

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

export function usePaste() {
  useEffect(() => {
    async function handlePaste() {
      const store = useAppStore.getState();

      // 1. Text -> Markdown file.
      try {
        const text = await readText();
        if (text && text.length > 0) {
          await store.ingestText(text);
          return;
        }
      } catch {
        /* no text available */
      }

      // 2. Image -> PNG file. On the Tauri `Image`, `rgba()` and `size()` are
      //    async methods (size returns { width, height }).
      try {
        const img = await readImage();
        const { width, height } = await img.size();
        if (width > 0 && height > 0) {
          const rgba = await img.rgba();
          await useAppStore.getState().ingestImage(rgba, width, height);
          return;
        }
      } catch {
        /* no image available */
      }

      // 3. Nothing usable on the clipboard.
      useAppStore.getState().addToast('Clipboard is empty', 'info');
    }

    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        if (isEditable(document.activeElement)) return;
        e.preventDefault();
        void handlePaste();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
