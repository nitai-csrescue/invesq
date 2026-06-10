import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 3600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const flowSteps = ["Assess", "Score", "Recommend", "Plan"];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div 
        className="text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="text-[2vw] text-primary uppercase tracking-[0.2em] font-bold mb-2">Introducing</h2>
        <h1 className="font-display text-[8vw] font-black text-white leading-none tracking-tighter">
          CS Rescue
        </h1>
        <p className="text-[2.2vw] text-text-secondary mt-4 max-w-[60vw] mx-auto">
          AI-native operational intelligence. Not just another CRM.
        </p>
      </motion.div>

      <div className="flex gap-[3vw] mt-[8vh]">
        {flowSteps.map((step, i) => (
          <motion.div
            key={step}
            className="flex items-center gap-[3vw]"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= i + 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="px-6 py-3 rounded-full border border-primary/30 bg-primary/10 text-[1.5vw] font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              {step}
            </div>
            {i < flowSteps.length - 1 && (
              <motion.div 
                className="w-[2vw] h-[2px] bg-primary/50"
                initial={{ scaleX: 0 }}
                animate={phase >= i + 2 ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                style={{ transformOrigin: "left" }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
