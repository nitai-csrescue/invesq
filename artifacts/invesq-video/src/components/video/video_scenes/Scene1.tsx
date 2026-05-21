import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import invesqLogo from '@assets/INVESQ_Favicon_Selected_Version_1778728139835.png';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center items-center z-10 px-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <div className="flex items-center gap-6 mb-12">
        <motion.img 
          src={invesqLogo} 
          alt="INVESQ" 
          className="w-20 h-20"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
        <motion.h1 
          className="text-6xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          INVESQ
        </motion.h1>
      </div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          The third pillar of due diligence.
        </h2>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
          Operational revenue risk identified before close — alongside financial and legal diligence.
        </p>
      </motion.div>

      <motion.div 
        className="mt-16 w-full max-w-5xl grid grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 40 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.8 }}
      >
        <div className="col-span-3 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-[var(--color-accent)] font-mono uppercase tracking-wider mb-1">Target Deal</p>
              <h3 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Project Atlas</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Operational Risk Score</p>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[var(--color-warning)] to-[var(--color-error)]"
                    initial={{ width: 0 }}
                    animate={phase >= 3 ? { width: '74%' } : { width: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-2xl font-bold text-[var(--color-error)]">7.4<span className="text-lg text-[var(--color-text-secondary)]">/10</span></span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="ARR" value="$18.0M" show={phase >= 3} delay={0} />
            <StatCard label="NRR" value="91%" sub="Below 100%" show={phase >= 3} delay={0.1} />
            <StatCard label="Gross Churn" value="16%" sub="Above 12%" show={phase >= 3} delay={0.2} />
            <StatCard label="Median TTV" value="74 days" sub="vs 32d target" show={phase >= 3} delay={0.3} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value, sub, show, delay }: { label: string, value: string, sub?: string, show: boolean, delay: number }) {
  return (
    <motion.div 
      className="bg-black/40 p-4 rounded-xl border border-white/5"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay }}
    >
      <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-error)] mt-1">{sub}</p>}
    </motion.div>
  );
}
