import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import engagementImg from "@assets/cs-rescue-scorecard/scorecard-engagement.jpg";
import boardImg from "@assets/cs-rescue-scorecard/scorecard-board.jpg";

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-start pt-[10vh] overflow-hidden"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)' }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="text-center z-10 relative"
        initial={{ y: -30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: -30, opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="inline-block px-4 py-1 rounded-full bg-accent/20 text-accent text-[1.2vw] font-bold tracking-widest uppercase mb-4">
          Recommend & Plan
        </div>
        <h2 className="font-display text-[4.5vw] font-bold text-white leading-tight">
          A Prioritized 90-Day Plan
        </h2>
      </motion.div>

      <div className="relative w-full h-full flex justify-center items-center mt-8">
        
        {/* Engagement Plan */}
        <motion.div
          className="absolute w-[45vw] z-20 top-[5vh]"
          initial={{ opacity: 0, y: 100, rotateX: 10 }}
          animate={
            phase >= 3 ? { opacity: 0.6, scale: 0.85, y: '-5vh', x: '-15vw', rotateX: 0 } :
            phase >= 2 ? { opacity: 1, y: 0, scale: 1, x: 0, rotateX: 0 } :
            { opacity: 0, y: 100, rotateX: 10 }
          }
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{ perspective: 1000 }}
        >
          <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <img src={engagementImg} alt="Engagement Plan" className="w-full h-auto object-contain bg-bg-light" />
          </div>
        </motion.div>

        {/* Board Ready Output */}
        <motion.div
          className="absolute w-[50vw] z-30 bottom-[10vh]"
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={
            phase >= 4 ? { opacity: 1, y: 0, scale: 1, x: '10vw' } :
            { opacity: 0, y: 100, scale: 0.9 }
          }
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <div className="rounded-xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.6)] border border-white/20">
            <img src={boardImg} alt="Board Ready Output" className="w-full h-auto object-contain bg-bg-light" />
          </div>
          <motion.div 
            className="absolute -bottom-6 -right-6 bg-primary text-white font-bold px-6 py-3 rounded-lg shadow-xl text-[1.5vw]"
            initial={{ opacity: 0, scale: 0 }}
            animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: 0.5, type: 'spring' }}
          >
            Board-Ready Clarity
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}
