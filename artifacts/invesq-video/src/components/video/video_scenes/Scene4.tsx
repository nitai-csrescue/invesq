import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const actions = [
    { title: 'Activate escalation workflow', days: '1–15', priority: 'P0', impact: 'Protects $2.6M' },
    { title: 'Auto-route expansion signals', days: '1–30', priority: 'P0', impact: 'Recovers $1.8M' },
    { title: 'Redesign onboarding milestones', days: '15–45', priority: 'P1', impact: 'Cuts TTV 25–30d' },
    { title: 'Top-25 account playbooks', days: '30–60', priority: 'P1', impact: 'De-risks $4.2M' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 px-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full max-w-6xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            The AI Playbook
          </h2>
          <p className="text-2xl text-[var(--color-accent)]">
            What to do about it, in the first 100 days.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 relative">
          {/* Vertical timeline line */}
          <motion.div 
            className="absolute left-[120px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-accent)] to-[var(--color-accent-3)]"
            initial={{ height: 0 }}
            animate={phase >= 2 ? { height: '100%' } : { height: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {actions.map((action, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-8 relative z-10"
              initial={{ opacity: 0, x: 30 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.6, delay: i * 0.3 }}
            >
              <div className="w-32 text-right">
                <span className="font-mono text-[var(--color-text-secondary)] text-sm">Days {action.days}</span>
              </div>
              
              <div className="w-4 h-4 rounded-full bg-[var(--color-bg-dark)] border-2 border-[var(--color-accent)] relative flex-shrink-0">
                <motion.div 
                  className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                  initial={{ scale: 0 }}
                  animate={phase >= 3 ? { scale: 1 } : { scale: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.3 + 0.5 }}
                />
              </div>
              
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-6 flex justify-between items-center backdrop-blur-md hover:bg-white/10 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${action.priority === 'P0' ? 'bg-[var(--color-error)]/20 text-[var(--color-error)]' : 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'}`}>
                      {action.priority}
                    </span>
                    <h3 className="font-bold text-lg text-white">{action.title}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[var(--color-success)] font-bold">{action.impact}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
