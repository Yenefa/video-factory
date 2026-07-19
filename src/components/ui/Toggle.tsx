// Accessible switch. role="switch" + aria-checked. Spring-animated knob.

import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled, ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${
        checked ? 'justify-end bg-accent' : 'justify-start bg-line'
      }`}
      {...rest}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="h-3.5 w-3.5 rounded-full bg-white"
      />
    </button>
  );
}
