import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props { open: boolean; title: string; onClose: () => void; children: ReactNode }

// Uses the native <dialog> element. Children render only while open, so forms reset every time.
export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className='modal'
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className='modal__body'>
          <h2>{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}
