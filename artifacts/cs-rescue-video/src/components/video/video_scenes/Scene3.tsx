import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import summaryImg from "@assets/cs-rescue-scorecard/scorecard-summary.jpg";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[8vw]"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[35vw] z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-[1.2vw] font-bold tracking-widest uppercase mb-6">
            Assess & Score
          </div>
          <h2 className="font-display text-[5vw] font-bold text-white leading-[1.1] mb-6 tracking-tight">
            The CS Health Scorecard
          </h2>
          <p className="text-[1.8vw] text-text-secondary leading-relaxed">
            A definitive executive summary of your true customer lifecycle risk and readiness.
          </p>
        </motion.div>
      </div>

      <motion.div 
        className="w-[50vw] relative"
        initial={{ opacity: 0, rotateY: 20, x: 50, z: -100 }}
        animate={phase >= 2 ? { opacity: 1, rotateY: 0, x: 0, z: 0 } : { opacity: 0, rotateY: 20, x: 50, z: -100 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{ perspective: 1000 }}
      >
        <div className="rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5">
          <img src={summaryImg} alt="CS Health Scorecard Summary" className="w-full h-auto" />
        </div>

        {/* Callout Box */}
        <motion.div 
          className="absolute -left-[5vw] top-[20%] bg-bg-muted/90 backdrop-blur-md border border-white/10 p-6 rounded-xl shadow-2xl"
          initial={{ opacity: 0, scale: 0.8, x: -20 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="text-text-muted text-[1vw] uppercase tracking-wider font-bold mb-1">Weighted Score</div>
          <div className="text-white text-[3vw] font-display font-bold">11/20</div>
          <div className="text-warning font-bold text-[1.2vw] mt-2">Structured Build</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
