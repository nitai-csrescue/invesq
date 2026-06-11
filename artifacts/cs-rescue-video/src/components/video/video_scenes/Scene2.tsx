import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cursor } from '../Cursor';
import summaryImg from "@assets/cs-rescue-scorecard/scorecard-summary.jpg";

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Pan to scorecard
      setTimeout(() => setPhase(2), 2500),  // Move cursor to Health Score
      setTimeout(() => setPhase(3), 3500),  // Click & zoom Health Score
      setTimeout(() => setPhase(4), 5500),  // Move cursor to Retention Trends
      setTimeout(() => setPhase(5), 6500),  // Click & zoom Retention Trends
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Narrative Overlays */}
      <motion.div 
        className="absolute top-10 left-10 z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, x: -20 }}
        animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-blue-400 font-bold mr-3">PE Narrative</span>
        <span className="text-white/80">Identify hidden risks before acquisition.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-10 right-10 z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, x: 20 }}
        animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Reduce churn.</span>
      </motion.div>

      {/* Main UI */}
      <motion.div 
        className="w-[80vw] h-[80vh] relative shadow-2xl rounded-xl overflow-hidden border border-white/10"
        initial={{ scale: 0.9, y: 50, opacity: 0 }}
        animate={{
          scale: phase >= 5 ? 1.4 : phase >= 3 ? 1.4 : 1,
          x: phase >= 5 ? '-20vw' : phase >= 3 ? '20vw' : 0,
          y: phase >= 5 ? '10vh' : phase >= 3 ? '15vh' : 0,
          opacity: 1
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <img src={summaryImg} className="w-full h-full object-cover object-left-top" alt="Executive Summary" />
      </motion.div>

      <Cursor 
        x={
          phase >= 5 ? '70vw' : // retention
          phase >= 4 ? '70vw' :
          phase >= 3 ? '30vw' : // health score
          phase >= 2 ? '30vw' :
          '50vw'
        }
        y={
          phase >= 5 ? '40vh' : 
          phase >= 4 ? '40vh' :
          phase >= 3 ? '30vh' :
          phase >= 2 ? '30vh' :
          '80vh'
        }
        clicking={phase === 3 || phase === 5}
        label={
          phase >= 5 ? "Retention Trends" :
          phase >= 3 ? "Health Score" : 
          "Executive Summary"
        }
      />
    </motion.div>
  );
}
