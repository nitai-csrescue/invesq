import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import boardImg from "@assets/cs-rescue-scorecard/scorecard-board.jpg";

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500), // checks
      setTimeout(() => setPhase(3), 3500), // final statement
      setTimeout(() => setPhase(4), 5000), // subtitle
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const checks = [
    "Increased Retention",
    "Higher Expansion Revenue",
    "Faster Time-to-Value",
    "Stronger Customer Outcomes",
    "Greater Enterprise Value"
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#0B0F19]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Background Dashboard Image */}
      <motion.div
        className="absolute inset-0 w-full h-full z-0"
        initial={{ scale: 1.2, filter: 'blur(10px)', opacity: 0 }}
        animate={{ scale: 1.05, filter: 'blur(3px)', opacity: 0.8 }}
        transition={{ duration: 8, ease: "easeOut" }}
      >
        <img src={boardImg} className="w-full h-full object-cover object-top opacity-60" alt="Executive Dashboard" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent" />
      </motion.div>

      <div className="relative z-10 text-center max-w-5xl mx-auto px-8 w-full flex flex-col items-center justify-center h-full pt-10">
        
        <motion.div className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          {checks.map((check, i) => (
            <motion.div 
              key={check}
              className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 shadow-xl"
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={phase >= 2 ? { scale: 1, opacity: 1, y: 0 } : { scale: 0, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: phase >= 2 ? i * 0.15 : 0 }}
            >
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-white/90 font-medium tracking-wide">{check}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-white leading-tight drop-shadow-2xl">
            CS Rescue transforms operational data into measurable value creation.
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xl text-blue-400 font-body max-w-2xl mx-auto drop-shadow-lg">
            Helping investors make smarter decisions and portfolio companies grow more efficiently.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
