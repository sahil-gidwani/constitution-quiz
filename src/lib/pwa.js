import { useEffect, useState } from 'react';

// Offline support + "install app". The service worker only runs in production builds.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) { // in dev a cached app would hide code changes
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    return;
  }
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* e.g. file:// or private mode: the app still works online */ }); });
}

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** { canInstall, install(), iosHint, installed, offlineReady } */
export function useInstall() {
  const [, tick] = useState(0);
  const [offlineReady, setOfflineReady] = useState(!!navigator.serviceWorker?.controller);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    listeners.add(f);
    const onCtl = () => setOfflineReady(true);
    navigator.serviceWorker?.addEventListener('controllerchange', onCtl);
    navigator.serviceWorker?.ready.then(() => setOfflineReady(true)).catch(() => {});
    return () => { listeners.delete(f); navigator.serviceWorker?.removeEventListener('controllerchange', onCtl); };
  }, []);
  const installed = standalone();
  return {
    installed, offlineReady: offlineReady && import.meta.env.PROD,
    canInstall: !!deferred && !installed,
    iosHint: ios() && !installed && !deferred,
    install: async () => {
      if (!deferred) return 'unavailable';
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null; notify();
      return outcome;
    },
  };
}
