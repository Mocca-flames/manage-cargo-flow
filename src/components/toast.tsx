/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Kind = 'ok' | 'error';
interface ToastItem { id: number; message: string; kind: Kind }
interface ToastApi { push: (message: string, kind?: Kind) => void }

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, kind }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className='toasts' aria-live='polite'>
        {items.map((t) => (
          <div key={t.id} className={'toast ' + (t.kind === 'error' ? 'toast--error' : '')}>{t.message}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}
