import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cursor } from '../Cursor';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const target1Ref = useRef<HTMLTableRowElement>(null);
  const target2Ref = useRef<HTMLTableRowElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: '50vw', y: '80vh' });

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Pan in UI
      setTimeout(() => setPhase(2), 2000),  // Move cursor to Acme row
      setTimeout(() => setPhase(3), 3000),  // Click Acme row -> Drilldown Health Score
      setTimeout(() => setPhase(4), 5000),  // Move cursor to Global Ind row
      setTimeout(() => setPhase(5), 6000),  // Click Global Ind row -> Drilldown Retention
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
          x: `${rect.left + 100 - 6}px`, // 100px into the row horizontally
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
    { name: "Acme Corp", health: 92, arr: "$1.2M", risk: "$0", trend: "+5%", status: "Healthy" },
    { name: "TechFlow", health: 68, arr: "$850K", risk: "$850K", trend: "-12%", status: "At Risk" },
    { name: "Global Industries", health: 85, arr: "$2.4M", risk: "$0", trend: "+8%", status: "Expanding" },
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
        <h2 className="text-[2vw] text-blue-400 font-mono tracking-[0.2em] uppercase">Executive Summary</h2>
        <h1 className="text-[4vw] font-display font-bold text-white mt-1">
          {phase >= 5 ? "Retention Trends" : phase >= 3 ? "Overall Business Health" : "Portfolio Overview"}
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
        <span className="text-white/80">Identify hidden risks before acquisition.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-[5vh] right-[5vw] z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Reduce churn.</span>
      </motion.div>

      {/* Main UI Frame */}
      <motion.div 
        className="w-[85vw] h-[65vh] flex bg-[#111827] rounded-xl overflow-hidden shadow-2xl border border-white/10 relative"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      >
        {/* Table View (Fixed Width) */}
        <div className="w-[57vw] shrink-0 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-white font-medium">Customer Health Directory</h3>
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-white/5 rounded"></div>
              <div className="h-8 w-24 bg-white/5 rounded"></div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-sm">
                <th className="pb-3 pl-4 font-medium">Account</th>
                <th className="pb-3 font-medium">Health Score</th>
                <th className="pb-3 font-medium">ARR</th>
                <th className="pb-3 font-medium">ARR at Risk</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isActive = (phase >= 3 && i === 0 && phase < 5) || (phase >= 5 && i === 2);
                return (
                  <motion.tr 
                    key={i}
                    ref={i === 0 ? target1Ref : i === 2 ? target2Ref : null}
                    className={`border-b border-white/5 transition-colors relative ${isActive ? 'bg-blue-500/10' : ''}`}
                    animate={{ backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                  >
                    <td className="py-4 pl-4 font-medium text-white">{row.name}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-16 rounded-full bg-white/10 overflow-hidden`}>
                          <div className={`h-full ${row.health > 80 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${row.health}%` }}></div>
                        </div>
                        <span className="text-white/80 text-sm">{row.health}</span>
                      </div>
                    </td>
                    <td className="py-4 text-white/80">{row.arr}</td>
                    <td className={`py-4 ${row.risk !== "$0" ? 'text-red-400' : 'text-white/50'}`}>{row.risk}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs border ${
                        row.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        row.status === 'At Risk' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drill-down Drawer Area (Fixed Width) */}
        <div className="w-[28vw] shrink-0 relative bg-[#0d131f] border-l border-white/10 overflow-hidden">
          <AnimatePresence>
            {(phase >= 3) && (
              <motion.div 
                className="absolute inset-0 p-8 flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              >
                <h4 className="text-white/50 text-sm uppercase tracking-wider mb-2">Detailed Analysis</h4>
                {phase < 5 ? (
                  <>
                    <h3 className="text-2xl text-white font-bold mb-6">Acme Corp</h3>
                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 mb-6">
                      <div className="text-white/50 text-sm mb-1">Health Score Breakdown</div>
                      <div className="text-4xl text-emerald-400 font-bold mb-4">92/100</div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-white/80">Product Usage</span><span className="text-white">95/100</span></div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-400 w-[95%]"></div></div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-white/80">Support Tickets</span><span className="text-white">88/100</span></div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 w-[88%]"></div></div>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Account is showing strong adoption signals. Opportunity to position Enterprise expansion in Q3.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl text-white font-bold mb-6">Global Industries</h3>
                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 mb-6">
                      <div className="text-white/50 text-sm mb-1">Retention Trend</div>
                      <div className="text-4xl text-blue-400 font-bold mb-4">+8%</div>
                      <div className="flex items-end gap-2 h-20 mt-4">
                        {[40, 50, 60, 55, 70, 85].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-500/40 rounded-t-sm" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Consistent multi-quarter growth. Renewal probability estimated at 98%.
                    </p>
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
