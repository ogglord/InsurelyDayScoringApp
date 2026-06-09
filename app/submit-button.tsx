'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

// Submit button with clear lifecycle feedback:
//  - while the form action runs: disabled + a pending label ("Saving…")
//  - right after it completes: a brief animated "done" label ("Saved ✓")
// Prevents double-submits and confirms the operation finished. (Forms that
// redirect on success navigate away before "done" shows — the redirect is
// their feedback.)
export function SubmitButton({
  children,
  className,
  style,
  pendingLabel = 'Saving…',
  doneLabel = 'Saved ✓',
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  pendingLabel?: string;
  doneLabel?: string;
}) {
  const { pending } = useFormStatus();
  const [done, setDone] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      setDone(true);
      const t = setTimeout(() => setDone(false), 1600);
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);

  const cls = [className, done ? 'is-done' : ''].filter(Boolean).join(' ');

  return (
    <button
      type="submit"
      className={cls || undefined}
      style={style}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : done ? doneLabel : children}
    </button>
  );
}
