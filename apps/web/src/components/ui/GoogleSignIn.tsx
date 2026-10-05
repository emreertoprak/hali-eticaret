'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { AuthProviders } from '@/lib/types';

interface GoogleAccountsId {
  initialize(options: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: 'popup'; itp_support?: boolean }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

let providersPromise: Promise<AuthProviders> | null = null;
const loadProviders = () => (providersPromise ??= apiFetch<AuthProviders>('/auth/providers').catch(() => ({ password: true, google: { enabled: false, clientId: null } })));

/**
 * GIS sayfa başına tek bir initialize bekler; birden fazla buton (giriş + kayıt kartı) aynı
 * başlatmayı paylaşır. Her iki buton da aynı uca (/auth/google) gittiği için credential son
 * çizilen butonun işleyicisine iletilir.
 */
let initializedFor: string | null = null;
let activeHandler: ((credential: string) => void) | null = null;

function ensureInitialized(clientId: string) {
  if (initializedFor === clientId || !window.google) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (r) => activeHandler?.(r.credential),
    ux_mode: 'popup',
    itp_support: true,
  });
  initializedFor = clientId;
}

/**
 * "Google ile devam et" butonu (Google Identity Services). Google'ın döndürdüğü ID token
 * (credential) backend'de imza ve audience kontrolüyle doğrulanır. Client ID API'den gelir;
 * tanımlı değilse buton hiç gösterilmez.
 */
export function GoogleSignIn({ onCredential, context = 'signin' }: { onCredential: (credential: string) => void; context?: 'signin' | 'signup' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(typeof window !== 'undefined' && Boolean(window.google?.accounts));
  const handler = useRef(onCredential);
  handler.current = onCredential;

  useEffect(() => {
    void loadProviders().then((p) => setClientId(p.google.enabled ? p.google.clientId : null));
  }, []);

  // next/script'in onReady'si aynı betiği kullanan bileşenlerden yalnızca birine haber verebilir;
  // her buton betiğin yüklenmesini kendisi bekler.
  useEffect(() => {
    if (!clientId || scriptReady) return;
    const id = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptReady(true);
        window.clearInterval(id);
      }
    }, 100);
    const stop = window.setTimeout(() => window.clearInterval(id), 15_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [clientId, scriptReady]);

  useEffect(() => {
    if (!clientId || !scriptReady || !ref.current || !window.google) return;
    ensureInitialized(clientId);
    activeHandler = (credential) => handler.current(credential);
    window.google.accounts.id.renderButton(ref.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: context === 'signup' ? 'signup_with' : 'continue_with',
      locale: 'tr',
      width: Math.min(400, ref.current.offsetWidth || 320),
    });
  }, [clientId, scriptReady, context]);

  if (!clientId) return null;
  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div className="my-4 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-line" /> veya <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={ref} className="flex min-h-[44px] w-full justify-center" aria-label="Google ile devam et" />
    </div>
  );
}
