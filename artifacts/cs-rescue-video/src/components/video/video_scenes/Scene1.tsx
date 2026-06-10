import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 5000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.8 }}
    >
      <video
        src={`${import.meta.env.BASE_URL}videos/bg-tech.mp4`}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
      />
      
      <div className="relative z-10 w-[80vw] mx-auto text-center">
        <div className="overflow-hidden">
          <motion.h1 
            className="font-display text-[6vw] font-bold text-white tracking-tight leading-tight"
            initial={{ y: '100%' }}
            animate={phase >= 1 ? { y: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            Customer risk is <span className="text-error">hidden</span>
          </motion.h1>
        </div>
        
        <div className="overflow-hidden mt-4">
          <motion.h2 
            className="text-[3vw] text-text-secondary font-body"
            initial={{ y: '100%', opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            across fragmented systems and manual processes.
          </motion.h2>
        </div>
      </div>
    </motion.div>
  );
}
