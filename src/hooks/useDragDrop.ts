// Drag & drop via Tauri's webview drag-drop event. Returns whether a drag is
// hovering the window, and calls `onDrop` with the dropped file paths.
// Tauri intercepts OS file drops and delivers absolute paths here.

import { useEffect, useRef, useState } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

export function useDragDrop(onDrop: (paths: string[]) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const cbRef = useRef(onDrop);
  cbRef.current = onDrop;

  useEffect(() => {
    const webview = getCurrentWebview();
    let unlisten: (() => void) | undefined;
    let active = true;

    webview
      .onDragDropEvent((event) => {
        const p = event.payload;
        if (p.type === 'enter' || p.type === 'over') {
          setIsDragging(true);
        } else if (p.type === 'leave') {
          setIsDragging(false);
        } else if (p.type === 'drop') {
          setIsDragging(false);
          if (active && p.paths.length > 0) cbRef.current(p.paths);
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        /* drag-drop listener optional */
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return { isDragging };
}
