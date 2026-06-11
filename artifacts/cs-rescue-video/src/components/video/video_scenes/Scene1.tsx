import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 5000),
      setTimeout(() => setPhase(4), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const systems = ['Salesforce', 'HubSpot', 'Zendesk', 'Jira', 'Gong', 'Slack', 'Sheets', 'Stripe'];
  const pos = [
    { x: '-30vw', y: '-30vh' },
    { x: '10vw', y: '-35vh' },
    { x: '35vw', y: '-15vh' },
    { x: '-35vw', y: '10vh' },
    { x: '30vw', y: '25vh' },
    { x: '-15vw', y: '35vh' },
    { x: '15vw', y: '30vh' },
    { x: '-25vw', y: '-10vh' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Fragmented Systems */}
        {systems.map((sys, i) => (
          <motion.div
            key={sys}
            className="absolute flex items-center justify-center bg-white/5 border border-white/10 rounded-xl px-6 py-3 font-mono text-sm tracking-widest text-white/50 shadow-lg backdrop-blur-sm"
            initial={{ x: pos[i].x, y: pos[i].y, scale: 0, opacity: 0 }}
            animate={
              phase >= 3 
                ? { x: 0, y: 0, scale: 0, opacity: 0 } // Converge
                : phase >= 1 
                  ? { x: pos[i].x, y: pos[i].y, scale: 1, opacity: 1 } 
                  : { x: pos[i].x, y: pos[i].y, scale: 0, opacity: 0 }
            }
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: phase === 1 ? i * 0.1 : 0 }}
          >
            {sys}
          </motion.div>
        ))}

        {/* First Message */}
        <motion.div 
          className="absolute z-10 w-full text-center px-12"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 && phase < 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-medium tracking-tight max-w-4xl mx-auto leading-tight">
            Critical customer intelligence is fragmented across dozens of systems.
          </h1>
        </motion.div>

        {/* The Solution */}
        <motion.div 
          className="absolute z-20 flex flex-col items-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 25 }}
        >
          <div className="w-32 h-32 mb-8 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.5)] border border-blue-400/30">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="text-blue-400 font-mono text-sm tracking-[0.2em] mb-4 uppercase">CS Rescue</div>
            <h2 className="text-5xl font-display font-medium tracking-tight">One Platform. One Source of Truth.</h2>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
