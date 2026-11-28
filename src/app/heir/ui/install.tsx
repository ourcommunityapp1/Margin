'use client';

// "Install Katekize": adds the app to the home screen. Chrome, Edge and Android offer a real install button;
// iPhones and iPads have no button, so the steps are shown instead.

import { useEffect, useState } from 'react';

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
type Where = 'unknown' | 'installed' | 'ios' | 'other';

export function InstallApp() {
  const [where, setWhere] = useState<Where>('unknown');
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    Promise.resolve().then(() => setWhere(standalone ? 'installed' : ios ? 'ios' : 'other'));
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    const onInstalled = () => { setPrompt(null); setDone(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (where === 'unknown') return null;
  const ask = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === 'accepted') setDone(true);
  };

  return (
    <section className="hr-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="Install Katekize">
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/heir/icon-192.png" width={48} height={48} alt="" style={{ borderRadius: 12, flex: 'none' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Install Katekize</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Open it from your home screen, full screen, like any app.</span>
        </span>
      </span>
      {where === 'installed' || done ? (
        <p style={{ margin: 0, fontSize: 15, color: 'var(--good)' }}>{done && where !== 'installed' ? 'Installed. Look for the K on your home screen.' : 'Katekize is installed on this device.'}</p>
      ) : prompt ? (
        <button type="button" className="hr-btn" onClick={ask}>Install the app</button>
      ) : where === 'ios' ? (
        <ol style={{ margin: 0, paddingLeft: 22, fontSize: 15, lineHeight: 1.5, display: 'grid', gap: 4 }}>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
      ) : (
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--muted)' }}>In your browser’s menu, choose <b style={{ color: 'var(--ink)' }}>Install app</b> or <b style={{ color: 'var(--ink)' }}>Add to Home Screen</b>.</p>
      )}
    </section>
  );
}
