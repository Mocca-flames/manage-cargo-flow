import { useRegisterSW } from 'virtual:pwa-register/react';

const HOUR = 60 * 60 * 1000;

export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // An installed app can stay open all day. Check for a new build every hour.
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      window.setInterval(() => {
        if (navigator.onLine) void registration.update();
      }, HOUR);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className='update-banner' role='status'>
      <span>A new version is available. Reloading discards unsaved changes.</span>
      <button className='btn btn--primary btn--sm' onClick={() => void updateServiceWorker(true)}>Reload</button>
      <button className='btn btn--ghost btn--sm' onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
