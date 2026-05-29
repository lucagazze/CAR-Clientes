import React, { useState, useEffect } from 'react';

interface Props {
  loading: boolean;
  color?: string;
}

export const TopLoadingBar: React.FC<Props> = ({ loading, color = '#8b5cf6' }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(0);
      const start = Date.now();
      const tick = setInterval(() => {
        const elapsed = Date.now() - start;
        // Fast to 30%, medium to 60%, slow crawl to 85%
        const p = elapsed < 400 ? (elapsed / 400) * 30
          : elapsed < 1500 ? 30 + ((elapsed - 400) / 1100) * 30
          : Math.min(85, 60 + ((elapsed - 1500) / 10000) * 25);
        setProgress(p);
      }, 50);
      return () => clearInterval(tick);
    } else if (visible) {
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2.5px] bg-transparent pointer-events-none">
      <div
        className="h-full rounded-full transition-all duration-200"
        style={{
          width: `${progress}%`,
          background: `linear-gradient(to right, ${color}, ${color}dd)`,
          boxShadow: `0 0 8px ${color}80`,
          opacity: progress === 100 ? 0 : 1,
          transition: progress === 100 ? 'width 0.1s ease, opacity 0.3s ease 0.1s' : 'width 0.2s ease',
        }}
      />
    </div>
  );
};
