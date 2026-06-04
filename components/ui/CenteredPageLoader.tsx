import React, { useEffect, useState, useRef } from 'react';

interface Props {
  isLoading: boolean;
  children: React.ReactNode;
}

const MESSAGES = [
  'Conectando con tu cuenta...',
  'Cargando datos del cliente...',
  'Sincronizando campañas...',
  'Preparando todo para vos...',
  'Casi listo...',
  'Un segundo más...',
  'Optimizando la vista...',
  'Traemos la info más fresca...',
];

export const CenteredPageLoader: React.FC<Props> = ({ isLoading, children }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [msgIdx, setMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  // Progress simulation — always 0→100, strictly monotonic (never backwards)
  useEffect(() => {
    clearAllTimeouts();
    if (isLoading) {
      setProgress(0);
      setPhase('loading');
      // Scheduled milestones: [delay_ms, target_%]
      const steps: [number, number][] = [
        [80,   18],
        [400,  42],
        [950,  67],
        [1900, 83],
      ];
      steps.forEach(([delay, target]) => {
        const t = setTimeout(() => setProgress(prev => Math.max(prev, target)), delay);
        timeoutsRef.current.push(t);
      });
    } else {
      // Loading finished — jump to 100 then fade out
      setProgress(100);
      setPhase('fading');
      const t = setTimeout(() => setPhase('done'), 380);
      timeoutsRef.current.push(t);
    }
    return clearAllTimeouts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Rotating messages with fade animation
  useEffect(() => {
    if (phase !== 'loading') return;
    const cycle = () => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % MESSAGES.length);
        setMsgVisible(true);
      }, 350);
    };
    const interval = setInterval(cycle, 2200);
    return () => clearInterval(interval);
  }, [phase]);

  if (phase === 'done' || phase === 'fading') return <>{children}</>;

  return (
    <div
      className="w-full flex flex-col items-center justify-center px-4"
      style={{ minHeight: 'calc(100vh - 80px)' }}
    >
      {/* Logo con bounce */}
      <div className="mb-10 flex flex-col items-center gap-5">
        <img
          src="/assets/logoSinFondo.png"
          alt="Algoritmia"
          className="w-14 h-14 object-contain"
          style={{
            animation: 'alg-bounce 0.85s ease-in-out infinite',
            filter: 'drop-shadow(0 0 18px rgba(139,92,246,0.55))',
          }}
        />
        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.22em]">
          C.A.R · Algoritmia
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-64 space-y-3">
        <div className="w-full h-[4px] bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              boxShadow: '0 0 10px rgba(139,92,246,0.7)',
            }}
          />
        </div>

        {/* Mensaje rotativo */}
        <p
          className="text-center text-[12px] text-zinc-400 font-medium transition-all duration-300"
          style={{
            opacity: msgVisible ? 1 : 0,
            transform: msgVisible ? 'translateY(0)' : 'translateY(4px)',
          }}
        >
          {MESSAGES[msgIdx]}
        </p>
      </div>

      {/* Keyframes inyectados inline */}
      <style>{`
        @keyframes alg-bounce {
          0%, 100% { transform: translateY(0px); }
          45%       { transform: translateY(-18px); }
          65%       { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};
