import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cursor } from '../Cursor';

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const target1Ref = useRef<HTMLTableRowElement>(null);
  const target2Ref = useRef<HTMLTableRowElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: '50vw', y: '80vh' });

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Cursor move
      setTimeout(() => setPhase(3), 3000), // Click -> detail
      setTimeout(() => setPhase(4), 5000), // Cursor move
      setTimeout(() => setPhase(5), 6000), // Click -> next detail
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    const updateCursor = () => {
      let target: HTMLElement | null = null;
      if (phase >= 4) target = target2Ref.current;
      else if (phase >= 2) target = target1Ref.current;

      if (target) {
        const rect = target.getBoundingClientRect();
        setCursorPos({
          x: `${rect.left + 100 - 6}px`, // 100px into row
          y: `${rect.top + rect.height * 0.5 - 6}px`
        });
      } else {
        setCursorPos({ x: '50vw', y: '80vh' });
      }
    };
    
    const t = setTimeout(updateCursor, 50);
    window.addEventListener('resize', updateCursor);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateCursor);
    };
  }, [phase]);

  const data = [
    { name: "Acme Corp", arr: "$1.2M", opp: "Platform Upgrade", value: "$400K", likelihood: "High" },
    { name: "Global Industries", arr: "$2.4M", opp: "Seat Expansion", value: "$150K", likelihood: "Medium" },
    { name: "TechFlow", arr: "$850K", opp: "Retention Rescue", value: "Save $850K", likelihood: "Low" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-start pt-[8vh] overflow-hidden bg-[#0B0F19]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Top Header */}
      <motion.div 
        className="z-50 text-center mb-[4vh]"
        initial={{ y: -30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: -30, opacity: 0 }}
      >
        <h2 className="text-[2vw] text-amber-400 font-mono tracking-[0.2em] uppercase">Value Creation</h2>
        <h1 className="text-[4vw] font-display font-bold text-white mt-1">
          {phase >= 5 ? "Retention Improvements" : phase >= 3 ? "Upsell Potential" : "Opportunity Pipeline"}
        </h1>
      </motion.div>

      {/* Narrative Overlays */}
      <motion.div 
        className="absolute bottom-[5vh] left-[5vw] z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-blue-400 font-bold mr-3">PE Narrative</span>
        <span className="text-white/80">Track operational improvements across portfolio companies.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-[5vh] right-[5vw] z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Improve customer health and retention.</span>
      </motion.div>

      {/* Main UI Frame */}
      <motion.div 
        className="w-[85vw] h-[65vh] flex bg-[#111827] rounded-xl overflow-hidden shadow-2xl border border-white/10 relative"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      >
        {/* Table View (Fixed Width) */}
        <div className="w-[55vw] shrink-0 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-white font-medium">Growth Actions</h3>
            <div className="flex gap-2">
              <div className="px-4 py-1.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/30">
                + $550K IDENTIFIED
              </div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-sm">
                <th className="pb-3 pl-4 font-medium">Account</th>
                <th className="pb-3 font-medium">Action Type</th>
                <th className="pb-3 font-medium">Est. Value</th>
                <th className="pb-3 font-medium">Likelihood</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isActive = (phase >= 3 && i === 0 && phase < 5) || (phase >= 5 && i === 2);
                return (
                  <motion.tr 
                    key={i}
                    ref={i === 0 ? target1Ref : i === 2 ? target2Ref : null}
                    className={`border-b border-white/5 transition-colors relative ${isActive ? 'bg-amber-500/10' : ''}`}
                    animate={{ backgroundColor: isActive ? 'rgba(245, 158, 11, 0.1)' : 'transparent' }}
                  >
                    <td className="py-5 pl-4 font-medium text-white">{row.name}</td>
                    <td className="py-5 text-white/80">{row.opp}</td>
                    <td className="py-5 text-emerald-400 font-bold">{row.value}</td>
                    <td className="py-5">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          <div className={`w-1.5 h-3 rounded-full ${row.likelihood === 'High' || row.likelihood === 'Medium' || row.likelihood === 'Low' ? 'bg-amber-400' : 'bg-white/20'}`}></div>
                          <div className={`w-1.5 h-4 rounded-full ${row.likelihood === 'High' || row.likelihood === 'Medium' ? 'bg-amber-400' : 'bg-white/20'}`}></div>
                          <div className={`w-1.5 h-5 rounded-full ${row.likelihood === 'High' ? 'bg-amber-400' : 'bg-white/20'}`}></div>
                        </div>
                        <span className="text-white/60 text-xs">{row.likelihood}</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drill-down Drawer Area (Fixed Width) */}
        <div className="w-[30vw] shrink-0 relative bg-[#0d131f] border-l border-white/10 overflow-hidden">
          <AnimatePresence>
            {(phase >= 3) && (
              <motion.div 
                className="absolute inset-0 p-8 flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              >
                {phase < 5 ? (
                  <>
                    <div className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-2">Upsell Playbook</div>
                    <h3 className="text-2xl text-white font-bold mb-1">Acme Corp</h3>
                    <div className="text-emerald-400 text-xl font-mono mb-6">+$400K Expansion</div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="font-medium text-white mb-2">Trigger Event</div>
                        <p className="text-white/70 text-sm">Platform utilization reached 95% threshold. Usage of advanced features increased 3x over 30 days.</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="font-medium text-white mb-2">Recommended Action</div>
                        <p className="text-white/70 text-sm">Initiate Enterprise Upgrade playbook. Auto-drafted email available for Account Executive.</p>
                        <div className="mt-3 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded text-center inline-block">Execute Playbook</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-2">Retention Playbook</div>
                    <h3 className="text-2xl text-white font-bold mb-1">TechFlow</h3>
                    <div className="text-red-400 text-xl font-mono mb-6">Save $850K ARR</div>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="font-medium text-white mb-2">Risk Factor</div>
                        <p className="text-white/70 text-sm">Implementation stalled. Executive sponsor removed from directory.</p>
                      </div>
                      <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                        <div className="font-medium text-red-400 mb-2">Rescue Action Plan</div>
                        <ul className="text-white/80 text-sm space-y-2 list-disc pl-4">
                          <li>Escalate to VP Customer Success</li>
                          <li>Schedule executive alignment meeting</li>
                          <li>Pause billing until integration unblocked</li>
                        </ul>
                        <div className="mt-4 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded text-center inline-block">Trigger Intervention</div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>

      <Cursor 
        x={cursorPos.x}
        y={cursorPos.y}
        clicking={phase === 3 || phase === 5}
      />
    </motion.div>
  );
}
