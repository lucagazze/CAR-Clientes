import React, { useEffect, useState } from 'react';

interface Props {
  isLoading: boolean;
  children: React.ReactNode;
}

export const CenteredPageLoader: React.FC<Props> = ({ isLoading, children }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      setPhase('loading');
      const t1 = setTimeout(() => setProgress(20), 80);
      const t2 = setTimeout(() => setProgress(45), 350);
      const t3 = setTimeout(() => setProgress(70), 900);
      const t4 = setTimeout(() => setProgress(85), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
    } else {
      setProgress(100);
      setPhase('fading');
      const t = setTimeout(() => setPhase('done'), 380);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  if (phase === 'done') return <>{children}</>;

  return (
    <>
      {/* Full-screen centered loader overlay */}
      <div
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-opacity duration-350 ${phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        {/* Logo icon */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <svg className="w-10 h-10 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
          </svg>
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">C.A.R · Algoritmia</span>
        </div>

        {/* Progress bar */}
        <div className="w-56 space-y-2">
          <div className="w-full h-[3px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 font-medium">Cargando</span>
            <span className="text-[10px] text-zinc-400 font-bold tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Page content — rendered but invisible so layout is computed */}
      <div className="invisible pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </>
  );
};
