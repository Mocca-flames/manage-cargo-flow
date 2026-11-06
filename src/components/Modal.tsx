import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

// Uses the native <dialog> element, styled as a mobile bottom sheet.
// Children render only while open, so forms reset every time.
export function Modal({ open, title, onClose, children, className }: Props) {
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
      className={`modal ${className ?? ''}`.trim()}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      {open && (
        <div className='modal__sheet'>
          <div className='modal__handle' aria-hidden='true' />
          <div className='modal__head'>
            <h2>{title}</h2>
            <button type='button' className='modal__close' aria-label='Close' onClick={onClose}>
              ×
            </button>
          </div>
          <div className='modal__body'>{children}</div>
        </div>
      )}
    </dialog>
  );
}
