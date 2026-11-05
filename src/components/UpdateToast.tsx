import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const FIFTEEN_MIN = 15 * 60 * 1000;

export function UpdateToast() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // An installed app can stay open all day. Check for a new build every 15 minutes.
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration ?? null;
      if (!registration) return;
      window.setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, FIFTEEN_MIN);
    },
  });

  // Also check for a new build whenever the tab regains focus, so a deploy
  // made while the admin was away is picked up on their next look.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registrationRef.current?.update();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!needRefresh) return null;
  return (
    <div className='update-banner' role='status'>
      <span>New version ready — reload?</span>
      <button className='btn btn--primary btn--sm' onClick={() => void updateServiceWorker(true)}>Reload</button>
      <button className='btn btn--ghost btn--sm' onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
