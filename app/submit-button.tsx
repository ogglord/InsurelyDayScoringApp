'use client';

import { useFormStatus } from 'react-dom';

// Submit button that disables itself while the form action is in flight,
// preventing accidental double-submits.
export function SubmitButton({
  children,
  className,
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (pendingLabel ?? 'Saving…') : children}
    </button>
  );
}
