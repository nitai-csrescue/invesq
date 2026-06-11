import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cursor } from '../Cursor';
import evidenceImg from "@assets/cs-rescue-scorecard/scorecard-evidence.jpg";

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Cursor move
      setTimeout(() => setPhase(3), 3000), // Click & Zoom findings
      setTimeout(() => setPhase(4), 5000), // Cursor move
      setTimeout(() => setPhase(5), 6000), // Click & Zoom process
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
      <motion.div 
        className="absolute top-10 left-10 z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, x: -20 }}
        animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-blue-400 font-bold mr-3">PE Narrative</span>
        <span className="text-white/80">Measure value creation post-close.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-10 right-10 z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, x: 20 }}
        animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Increase expansion revenue.</span>
      </motion.div>

      <motion.div 
        className="w-[80vw] h-[80vh] relative shadow-2xl rounded-xl overflow-hidden border border-white/10"
        initial={{ scale: 0.9, y: 50, opacity: 0 }}
        animate={{
          scale: phase >= 5 ? 1.4 : phase >= 3 ? 1.4 : 1,
          x: phase >= 5 ? '10vw' : phase >= 3 ? '25vw' : 0,
          y: phase >= 5 ? '-20vh' : phase >= 3 ? '-10vh' : 0,
          opacity: 1
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <img src={evidenceImg} className="w-full h-full object-cover object-left-top" alt="Operational Intelligence" />
      </motion.div>

      <Cursor 
        x={
          phase >= 5 ? '40vw' : 
          phase >= 4 ? '40vw' :
          phase >= 3 ? '20vw' : 
          phase >= 2 ? '20vw' :
          '50vw'
        }
        y={
          phase >= 5 ? '70vh' : 
          phase >= 4 ? '70vh' :
          phase >= 3 ? '50vh' :
          phase >= 2 ? '50vh' :
          '80vh'
        }
        clicking={phase === 3 || phase === 5}
        label={
          phase >= 5 ? "Process Bottlenecks" :
          phase >= 3 ? "AI-Generated Findings" : 
          "Operational Intelligence"
        }
      />
    </motion.div>
  );
}
