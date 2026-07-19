// Expanding "Delete" button (Uiverse.io by vinodjangid07, adapted).
// A dark circle that expands on hover to reveal a "Delete" label and turns
// red. Set `size="sm"` for a compact variant suited to dense list rows.

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface DeleteButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'md' | 'sm';
}

export const DeleteButton = forwardRef<HTMLButtonElement, DeleteButtonProps>(
  function DeleteButton({ size = 'md', className = '', type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={`uv-delete ${size === 'sm' ? 'uv-sm' : ''} ${className}`.trim()}
        {...props}
      >
        <svg className="uv-svg" viewBox="0 0 448 512" aria-hidden="true" focusable="false">
          <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L56.4 445.4c1.7 26.4 23.9 46.6 50.3 46.6H341.3c26.4 0 48.6-20.2 50.3-46.6L416 128z" />
        </svg>
      </button>
    );
  },
);
