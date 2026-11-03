import { useId } from 'react';
import type { ReactNode } from 'react';

interface Props { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }

export function Field({ label, hint, error, children }: Props) {
  const id = useId();
  return (
    <div className='field'>
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className='field__hint muted'>{hint}</span>}
      {error && <span className='field__error' role='alert'>{error}</span>}
    </div>
  );
}
