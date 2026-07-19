// Modal for creating a new topic. Enter submits, Esc closes, input autofocused.

import { useEffect, useRef, useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { useAppStore } from '../store/useAppStore';
import { isValidTopicName, sanitizeTopicName } from '../lib/files';

export function NewTopicDialog() {
  const open = useAppStore((s) => s.newTopicDialogOpen);
  const closeNewTopicDialog = useAppStore((s) => s.closeNewTopicDialog);
  const createTopic = useAppStore((s) => s.createTopic);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const valid = isValidTopicName(name);

  function submit() {
    if (!valid) return;
    void createTopic(sanitizeTopicName(name));
  }

  return (
    <Dialog open={open} onClose={closeNewTopicDialog} className="w-[420px] max-w-[90vw] p-6">
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-2xl text-ink">New Topic</h2>
        <IconButton aria-label="Close" onClick={closeNewTopicDialog}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className="mt-5">
        <label
          htmlFor="new-topic-name"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft"
        >
          Topic Name
        </label>
        <input
          id="new-topic-name"
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="e.g. Kitchen Renovation"
          className="w-full rounded-subtle border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-accent focus:outline-none"
        />
        {!valid && name.length > 0 && (
          <p className="mt-1.5 text-[12px] text-ink-soft">
            Avoid reserved names like &quot;raw&quot; and the characters \ / : * ? &quot; &lt; &gt; |.
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={closeNewTopicDialog}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!valid}>
          Create
        </Button>
      </div>
    </Dialog>
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
