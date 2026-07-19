// Workspace header toggle for Quick Drop. Uses the reusable Toggle primitive.

import { useAppStore } from '../store/useAppStore';
import { useTopics } from '../hooks/useTopics';
import { Toggle } from './ui/Toggle';

export function QuickDropToggle() {
  const { current, topics } = useTopics();
  const quickDropEnabled = useAppStore((s) => s.quickDropEnabled);
  const quickDropTopicPath = useAppStore((s) => s.quickDropTopicPath);
  const enableQuickDrop = useAppStore((s) => s.enableQuickDrop);
  const disableQuickDrop = useAppStore((s) => s.disableQuickDrop);
  const addToast = useAppStore((s) => s.addToast);

  const lockedTopic = quickDropTopicPath
    ? topics.find((t) => t.path === quickDropTopicPath) ?? null
    : null;

  const on = quickDropEnabled && !!lockedTopic;

  function toggle(next: boolean) {
    if (next) {
      if (!current) {
        addToast('Select a topic to lock first', 'info');
        return;
      }
      void enableQuickDrop(current.path);
    } else {
      void disableQuickDrop();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {on && lockedTopic && (
        <span className="text-[12px] text-ink-soft">
          -&gt; <span className="text-accent">{lockedTopic.name}</span>
        </span>
      )}
      <Toggle checked={on} onChange={toggle} aria-label="Quick Drop" />
      <span className={`text-[12px] font-medium ${on ? 'text-ink' : 'text-ink-soft'}`}>
        Quick Drop
      </span>
    </div>
  );
}
