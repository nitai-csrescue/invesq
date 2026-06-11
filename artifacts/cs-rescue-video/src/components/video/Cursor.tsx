import { motion } from 'framer-motion';

export function Cursor({ 
  x, 
  y, 
  clicking = false
}: { 
  x: string | number, 
  y: string | number, 
  clicking?: boolean
}) {
  return (
    <motion.div
      className="absolute top-0 left-0 z-[100] pointer-events-none drop-shadow-xl flex items-start"
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1 }}
    >
      <motion.div
        animate={{ scale: clicking ? 0.8 : 1 }}
        transition={{ duration: 0.1 }}
        className="relative"
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="black" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
        {clicking && (
          <motion.div
            className="absolute top-1 left-1 w-8 h-8 rounded-full border-2 border-primary bg-primary/20"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
