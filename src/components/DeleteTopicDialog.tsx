// Confirmation dialog for deleting a topic (and all its collected files).
// The confirm action is the expanding Uiverse DeleteButton so the gesture
// itself carries a moment of intent.

import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { DeleteButton } from './ui/DeleteButton';
import { useAppStore } from '../store/useAppStore';

export function DeleteTopicDialog() {
  const open = useAppStore((s) => s.deleteTopicDialogOpen);
  const topic = useAppStore((s) => s.pendingDeleteTopic);
  const close = useAppStore((s) => s.closeDeleteTopicDialog);
  const confirm = useAppStore((s) => s.deleteTopic);

  return (
    <Dialog open={open} onClose={close} className="w-[420px] max-w-[90vw] p-6">
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-2xl text-ink">Delete Topic</h2>
        <IconButton aria-label="Close" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
        Delete <span className="font-medium text-ink">{topic?.name}</span>? This removes the topic
        and <span className="text-ink">every file collected inside it</span>. This cannot be undone.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={close}>
          Cancel
        </Button>
        {/* Fixed-width container so the button's hover expansion does not
            shift the Cancel button next to it. */}
        <div className="flex h-[50px] w-[140px] items-center justify-end overflow-visible">
          <DeleteButton
            aria-label="Confirm delete topic"
            title="Delete"
            onClick={() => void confirm()}
          />
        </div>
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
