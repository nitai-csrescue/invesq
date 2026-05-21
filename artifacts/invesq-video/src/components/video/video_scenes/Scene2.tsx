import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const systems = [
    { name: 'Salesforce', records: '9,400', color: '#00A1E0', angle: 0 },
    { name: 'HubSpot', records: '3,200', color: '#FF7A59', angle: 60 },
    { name: 'Zendesk', records: '6,800', color: '#03363D', angle: 120 },
    { name: 'Gong', records: '2,150', color: '#8B5CF6', angle: 180 },
    { name: 'Slack', records: '2,400', color: '#E01E5A', angle: 240 },
    { name: 'Zoom AI', records: '850', color: '#2D8CFF', angle: 300 },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-[45%] pl-20 pr-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl font-bold mb-6 leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            One operational graph,<br/>
            <span className="text-gradient">six source systems.</span>
          </h2>
          <p className="text-xl text-[var(--color-text-secondary)] mb-10 leading-relaxed">
            INVESQ ingests structured & unstructured signals from systems the company already runs.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <motion.div 
              className="border-l-2 border-[var(--color-accent)] pl-4"
              initial={{ opacity: 0, height: 0 }}
              animate={phase >= 2 ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Records Analyzed</p>
              <p className="text-3xl font-bold font-mono">24,800</p>
            </motion.div>
            <motion.div 
              className="border-l-2 border-[var(--color-accent-2)] pl-4"
              initial={{ opacity: 0, height: 0 }}
              animate={phase >= 2 ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-sm text-[var(--color-text-secondary)] mb-1">Activity Reviewed</p>
              <p className="text-3xl font-bold font-mono">14 days</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="w-[55%] relative h-[80vh] flex items-center justify-center">
        {/* Hub Diagram */}
        <div className="relative w-[500px] h-[500px] flex items-center justify-center">
          {/* Center node */}
          <motion.div 
            className="absolute z-20 w-32 h-32 rounded-full bg-gradient-to-br from-[var(--color-accent-2)] to-[var(--color-accent)] flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.4)]"
            initial={{ scale: 0 }}
            animate={phase >= 1 ? { scale: 1 } : { scale: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.4 }}
          >
            <span className="font-bold text-xl text-white tracking-widest" style={{ fontFamily: 'var(--font-display)' }}>INVESQ</span>
          </motion.div>

          {/* Orbiting nodes */}
          {systems.map((sys, i) => {
            const rad = (sys.angle * Math.PI) / 180;
            const radius = 200;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            return (
              <motion.div
                key={sys.name}
                className="absolute z-10 flex flex-col items-center justify-center"
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={phase >= 2 ? { opacity: 1, x, y } : { opacity: 0, x: 0, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.6 + i * 0.1 }}
              >
                {/* Connection Line */}
                <svg className="absolute w-[400px] h-[400px] pointer-events-none" style={{ left: -200 - x, top: -200 - y }}>
                  <motion.line
                    x1={200 + x} y1={200 + y} x2={200} y2={200}
                    stroke={sys.color} strokeWidth="2" strokeDasharray="4 4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={phase >= 3 ? { pathLength: 1, opacity: 0.4 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 1 }}
                  />
                </svg>

                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border border-white/10 backdrop-blur-md"
                  style={{ backgroundColor: `${sys.color}40` }}
                >
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: sys.color }} />
                </div>
                <div className="mt-3 text-center bg-black/60 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-sm">
                  <p className="font-bold text-sm text-white">{sys.name}</p>
                  <p className="text-xs font-mono text-white/70">{sys.records}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
