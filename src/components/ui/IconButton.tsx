// Square ghost button for icons (gear, close, open-folder, lock).

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-subtle text-ink-soft transition-colors duration-150 hover:bg-accent-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      {...props}
    />
  );
});
