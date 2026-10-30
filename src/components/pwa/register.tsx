'use client';
import { useEffect, useState } from 'react';
export function PwaRegister() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production')
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return offline ? (
    <div className="offline-banner" role="status">
      Você está sem conexão. Reconecte-se para consultar ou confirmar
      agendamentos.
    </div>
  ) : null;
}
