import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import pillarsImg from "@assets/cs-rescue-scorecard/scorecard-pillars.jpg";
import evidenceImg from "@assets/cs-rescue-scorecard/scorecard-evidence.jpg";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => setPhase(5), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background large text */}
      <motion.div 
        className="absolute top-[10%] w-full text-center z-0"
        initial={{ y: -50, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 0.2 } : { y: -50, opacity: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="font-display text-[12vw] font-black text-white whitespace-nowrap tracking-tighter">
          DEEP VISIBILITY
        </h1>
      </motion.div>

      {/* Pillars Image */}
      <motion.div
        className="absolute left-[10vw] w-[45vw] z-10"
        initial={{ opacity: 0, x: -100, rotateZ: -5 }}
        animate={
          phase >= 3 ? { opacity: 0.5, scale: 0.8, x: '-10vw', y: '-5vh', filter: 'blur(4px)' } :
          phase >= 2 ? { opacity: 1, x: 0, rotateZ: 0, scale: 1, filter: 'blur(0px)' } :
          { opacity: 0, x: -100, rotateZ: -5 }
        }
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
          <img src={pillarsImg} alt="Pillar Scores" className="w-full h-auto object-contain bg-bg-light" />
        </div>
      </motion.div>

      {/* Evidence Image */}
      <motion.div
        className="absolute right-[10vw] w-[50vw] z-20"
        initial={{ opacity: 0, x: 100, y: 50 }}
        animate={
          phase >= 4 ? { opacity: 1, x: 0, y: 0 } :
          { opacity: 0, x: 100, y: 50 }
        }
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/20">
          <img src={evidenceImg} alt="Evidence Review" className="w-full h-auto object-contain bg-bg-light" />
        </div>
      </motion.div>

      {/* Floating Copy */}
      <motion.div
        className="absolute bottom-[15%] left-[10vw] z-30 max-w-[30vw]"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <h3 className="text-[3vw] font-display font-bold text-white leading-tight">
          Backed by <span className="text-accent">real evidence.</span>
        </h3>
        <p className="text-[1.5vw] text-text-secondary mt-2">
          From customer data, operator interviews, and artifacts.
        </p>
      </motion.div>

    </motion.div>
  );
}
