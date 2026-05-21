import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import invesqLogo from '@assets/INVESQ_Favicon_Selected_Version_1778728139835.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center items-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div 
        className="grid grid-cols-4 gap-8 mb-20 max-w-5xl w-full px-10"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8 }}
      >
        <Metric title="Friction points" value="14" />
        <Metric title="Expansion Risk" value="$1.8M" color="var(--color-error)" />
        <Metric title="TTV Drag" value="42 days" color="var(--color-warning)" />
        <Metric title="Actions" value="7" color="var(--color-success)" />
      </motion.div>

      <motion.div
        className="flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <img src={invesqLogo} alt="INVESQ" className="w-24 h-24 mb-6" />
        <h1 className="text-7xl font-extrabold tracking-tight mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          INVESQ
        </h1>
        <p className="text-2xl text-[var(--color-text-secondary)] italic mb-8">
          The third pillar of due diligence.
        </p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
          className="text-sm font-mono text-[var(--color-text-muted)] border border-white/10 px-4 py-2 rounded-full"
        >
          Powered by CS Rescue
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Metric({ title, value, color = "white" }: { title: string, value: string, color?: string }) {
  return (
    <div className="text-center border-r border-white/10 last:border-0">
      <div className="text-4xl font-bold font-mono mb-2" style={{ color }}>{value}</div>
      <div className="text-sm text-[var(--color-text-secondary)] uppercase tracking-widest">{title}</div>
    </div>
  );
}
