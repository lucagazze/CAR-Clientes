import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

function formatTitle(file: string) {
  return file
    .replace('.html', '')
    .replace(/_/g, ' ')
    .replace(/\b(\w)/g, c => c.toUpperCase());
}

// ── Shared email chrome fields ─────────────────────────────────────────────
function EmailChrome({ subjectLine, preheader, mobile }: {
  subjectLine: string;
  preheader: string;
  mobile?: boolean;
}) {
  if (mobile) {
    return (
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '10px 14px 8px' }}>
        {/* Sender row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#c9a96e', fontSize: 11, fontWeight: 700, fontFamily: 'Arial' }}>TSF</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#111', fontFamily: 'Arial' }}>The Skirting Factory</div>
              <div style={{ fontSize: 10, color: '#888', fontFamily: 'Arial' }}>valentina@theskirtingfactoryllc.com</div>
            </div>
          </div>
          <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'Arial', flexShrink: 0 }}>Ahora</span>
        </div>
        {/* Subject */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'Arial', marginBottom: 2, lineHeight: 1.3 }}>
          {subjectLine}
        </div>
        {/* Preheader */}
        {preheader && (
          <div style={{ fontSize: 11, color: '#888', fontFamily: 'Arial', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preheader}
          </div>
        )}
      </div>
    );
  }

  // Desktop mac-style
  return (
    <div style={{
      background: '#f3f3f3',
      borderRadius: '8px 8px 0 0',
      border: '1px solid #d0d0d0',
      borderBottom: 'none',
      padding: '10px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
      </div>
      <div style={{ fontSize: 11, color: '#666', fontFamily: 'Arial, sans-serif', lineHeight: '1.75' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#333', display: 'inline-block', width: 80 }}>De:</span>
          <span style={{ color: '#1a73e8' }}>valentina@theskirtingfactoryllc.com</span>
        </div>
        <div>
          <span style={{ fontWeight: 700, color: '#333', display: 'inline-block', width: 80 }}>Asunto:</span>
          <span style={{ color: '#111' }}>{subjectLine}</span>
        </div>
        <div>
          <span style={{ fontWeight: 700, color: '#333', display: 'inline-block', width: 80 }}>Vista Previa:</span>
          <span style={{ color: '#888', fontStyle: preheader ? 'normal' : 'italic' }}>
            {preheader || 'Cargando…'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EmailPreviewPublicPage() {
  const params     = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const file       = params.get('email') ?? '';
  const subject    = params.get('subject') ?? '';
  const [mode, setMode]         = useState<'desktop' | 'mobile'>('desktop');
  const [preheader, setPreheader] = useState('');
  const iframeDesktop = useRef<HTMLIFrameElement>(null);
  const iframeMobile  = useRef<HTMLIFrameElement>(null);

  const label      = file ? formatTitle(file) : 'Email Preview';
  const subjectLine = subject || label;

  useEffect(() => {
    document.title = file ? `${subjectLine} — Algoritmia` : 'Email Preview — Algoritmia';
  }, [file, subjectLine]);

  const extractPreheader = (doc: Document) => {
    try {
      const hidden = doc.querySelector<HTMLElement>(
        '[style*="display:none"],[style*="display: none"],[class*="preheader"],[class*="preview"]'
      );
      if (hidden?.textContent?.trim()) { setPreheader(hidden.textContent.trim().slice(0, 120)); return; }
      const first = doc.querySelector('p, td');
      if (first?.textContent?.trim()) setPreheader(first.textContent.trim().slice(0, 120));
    } catch {}
  };

  const injectAndExtract = (ref: React.RefObject<HTMLIFrameElement>) => {
    try {
      const doc = ref.current?.contentDocument;
      if (!doc) return;
      if (doc.head && !doc.head.querySelector('base')) {
        const base = doc.createElement('base');
        base.target = '_blank';
        doc.head.insertBefore(base, doc.head.firstChild);
      }
      extractPreheader(doc);
    } catch {}
  };

  if (!file) return (
    <div className="h-screen flex items-center justify-center bg-zinc-100 text-zinc-500 text-sm">
      Email no especificado.
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: mode === 'desktop' ? '#d5d5d5' : '#1a1a1a' }}>

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e5e5e5',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 900, fontFamily: 'Arial' }}>A</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: 'Arial', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
            {subjectLine}
          </span>
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#f0f0f0', borderRadius: 10, padding: 4, flexShrink: 0, marginLeft: 12 }}>
          {(['desktop', 'mobile'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, fontFamily: 'Arial', transition: 'all 0.15s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#111' : '#888',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              {m === 'desktop'
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                : <svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>
              }
              <span style={{ display: 'none' }} className="sm-show">{m === 'desktop' ? 'Desktop' : 'Mobile'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Email container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>

        {mode === 'desktop' ? (
          /* ── DESKTOP ── */
          <div style={{ width: '100%', maxWidth: 660 }}>
            <EmailChrome subjectLine={subjectLine} preheader={preheader} />
            <div style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              <iframe
                ref={iframeDesktop}
                src={`/email-library/${file}`}
                onLoad={() => injectAndExtract(iframeDesktop)}
                scrolling="no"
                style={{ width: '100%', height: 2000, border: 'none', display: 'block' }}
              />
            </div>
          </div>
        ) : (
          /* ── MOBILE: phone frame with email chrome inside ── */
          <div style={{
            width: 375,
            borderRadius: 44,
            overflow: 'hidden',
            boxShadow: '0 28px 90px rgba(0,0,0,0.6)',
            border: '7px solid #1c1c1e',
            flexShrink: 0,
          }}>
            {/* Status bar */}
            <div style={{ height: 36, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Arial' }}>9:41</span>
              <div style={{ width: 80, height: 20, background: '#000', borderRadius: 10, border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 8, background: '#333', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 13v-2" strokeLinecap="round"/></svg>
              </div>
            </div>

            {/* Email app top bar (inside screen) */}
            <div style={{ background: '#f5f5f5', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e0e0e0' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111', fontFamily: 'Arial', flex: 1 }}>Bandeja de entrada</span>
            </div>

            {/* Scrollable screen */}
            <div style={{ height: 620, overflowY: 'auto', background: '#fff', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {/* Email chrome inside phone */}
              <EmailChrome subjectLine={subjectLine} preheader={preheader} mobile />
              {/* Email content */}
              <iframe
                ref={iframeMobile}
                src={`/email-library/${file}`}
                onLoad={() => injectAndExtract(iframeMobile)}
                scrolling="no"
                style={{ width: 361, height: 2000, border: 'none', display: 'block', pointerEvents: 'none' }}
              />
            </div>

            {/* Home bar */}
            <div style={{ height: 28, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 90, height: 5, background: '#333', borderRadius: 4 }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '12px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: mode === 'desktop' ? '#999' : '#444', fontFamily: 'Arial' }}>
          Powered by <span style={{ fontWeight: 700 }}>Algoritmia</span>
        </p>
      </div>
    </div>
  );
}
