import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const risks = [
    { title: 'Onboarding Friction', severity: 'Critical', impact: '$640K', desc: 'Median TTV 74d vs 32d target; 39% miss day-30 activation.', color: 'var(--color-error)' },
    { title: 'Founder Dependency', severity: 'High', impact: '$4.2M', desc: '63% of top-50 accounts list CEO as primary contact.', color: 'var(--color-warning)' },
    { title: 'Expansion Leakage', severity: 'High', impact: '$1.8M', desc: '47 expansion-qualified signals fired; 35 sit unowned.', color: 'var(--color-warning)' },
    { title: 'Support Escalation', severity: 'Medium', impact: '$2.6M', desc: '14 escalation clusters in top-100 accounts.', color: 'var(--color-accent)' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col justify-center z-10 px-24 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -30 }}
        transition={{ duration: 0.8 }}
        className="mb-12"
      >
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Four material risks, <span className="text-gradient">surfaced before close.</span>
        </h2>
        <p className="text-xl text-[var(--color-text-secondary)]">
          The friction map across the customer lifecycle reveals hidden revenue drag.
        </p>
      </motion.div>

      <div className="flex gap-12 h-full">
        <div className="w-1/2 flex flex-col justify-center gap-4">
          {risks.map((risk, i) => (
            <motion.div
              key={i}
              className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden backdrop-blur-sm"
              initial={{ opacity: 0, x: -50 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: risk.color }} />
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">{risk.title}</h3>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/10"
                    style={{ color: risk.color }}
                  >
                    {risk.severity}
                  </span>
                </div>
                <span className="font-mono font-bold text-xl">{risk.impact}</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{risk.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="w-1/2 flex items-center justify-center">
          <motion.div 
            className="w-full relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={phase >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8 }}
          >
            {/* Minimalist Journey Chart */}
            <div className="flex justify-between items-end h-64 border-b border-white/20 pb-4 relative">
              {/* Trend line */}
              <svg className="absolute inset-0 w-full h-full preserve-3d pointer-events-none">
                <motion.path 
                  d="M 10,40 L 90,140 L 170,180 L 250,120 L 330,160 L 410,90"
                  stroke="var(--color-accent-2)"
                  strokeWidth="4"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </svg>
              
              {[
                { stage: 'Sales', val: 78, color: 'var(--color-success)' },
                { stage: 'Handoff', val: 42, color: 'var(--color-warning)' },
                { stage: 'Implement', val: 28, color: 'var(--color-error)' },
                { stage: 'Adoption', val: 48, color: 'var(--color-warning)' },
                { stage: 'Expansion', val: 32, color: 'var(--color-error)' },
                { stage: 'Renewal', val: 55, color: 'var(--color-warning)' },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center w-16 relative z-10">
                  <motion.div 
                    className="w-3 h-3 rounded-full mb-2"
                    style={{ backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}` }}
                    initial={{ scale: 0 }}
                    animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  />
                  <div className="h-full flex flex-col justify-end">
                    <span className="text-xs text-[var(--color-text-secondary)] -rotate-45 origin-top-left mt-4">{s.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
