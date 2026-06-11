import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cursor } from '../Cursor';
import pillarsImg from "@assets/cs-rescue-scorecard/scorecard-pillars.jpg";

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Cursor move
      setTimeout(() => setPhase(3), 3000), // Click & Zoom
      setTimeout(() => setPhase(4), 5000), // Move to risk
      setTimeout(() => setPhase(5), 6000), // Click & Zoom
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
        <span className="text-white/80">Validate growth assumptions during diligence.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-10 right-10 z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, x: 20 }}
        animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Accelerate customer onboarding.</span>
      </motion.div>

      <motion.div 
        className="w-[80vw] h-[80vh] relative shadow-2xl rounded-xl overflow-hidden border border-white/10"
        initial={{ scale: 0.9, y: 50, opacity: 0 }}
        animate={{
          scale: phase >= 5 ? 1.5 : phase >= 3 ? 1.3 : 1,
          x: phase >= 5 ? '15vw' : phase >= 3 ? '-10vw' : 0,
          y: phase >= 5 ? '-15vh' : phase >= 3 ? '5vh' : 0,
          opacity: 1
        }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <img src={pillarsImg} className="w-full h-full object-cover object-left-top" alt="Customer Journey Analysis" />
      </motion.div>

      <Cursor 
        x={
          phase >= 5 ? '30vw' : 
          phase >= 4 ? '30vw' :
          phase >= 3 ? '60vw' : 
          phase >= 2 ? '60vw' :
          '80vw'
        }
        y={
          phase >= 5 ? '60vh' : 
          phase >= 4 ? '60vh' :
          phase >= 3 ? '40vh' :
          phase >= 2 ? '40vh' :
          '80vh'
        }
        clicking={phase === 3 || phase === 5}
        label={
          phase >= 5 ? "Risk Indicators" :
          phase >= 3 ? "Onboarding Performance" : 
          "Customer Journey"
        }
      />
    </motion.div>
  );
}
