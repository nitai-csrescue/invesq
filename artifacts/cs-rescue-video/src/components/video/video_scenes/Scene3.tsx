import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cursor } from '../Cursor';

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const target1Ref = useRef<HTMLTableRowElement>(null);
  const target2Ref = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: '50vw', y: '80vh' });

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Pan in UI
      setTimeout(() => setPhase(2), 2000),  // Cursor to TechFlow row
      setTimeout(() => setPhase(3), 3000),  // Click TechFlow -> Onboarding Performance
      setTimeout(() => setPhase(4), 5000),  // Cursor to TechFlow Risk tab in drawer
      setTimeout(() => setPhase(5), 6000),  // Click Risk tab -> Risk Indicators
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
        // If it's a div (the tab), center horizontally. If row, 100px in.
        const isTab = target.tagName.toLowerCase() === 'div';
        setCursorPos({
          x: `${rect.left + (isTab ? rect.width * 0.5 : 100) - 6}px`,
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
    { name: "Acme Corp", stage: "Adoption", ttv: "45 days", status: "On Track" },
    { name: "TechFlow", stage: "Onboarding", ttv: "Delayed (90+)", status: "Critical" },
    { name: "Global Industries", stage: "Renewal", ttv: "30 days", status: "Complete" },
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
        <h2 className="text-[2vw] text-emerald-400 font-mono tracking-[0.2em] uppercase">Customer Journey</h2>
        <h1 className="text-[4vw] font-display font-bold text-white mt-1">
          {phase >= 5 ? "Risk Indicators" : phase >= 3 ? "Onboarding Performance" : "Journey Analysis"}
        </h1>
      </motion.div>

      {/* Main UI Frame */}
      <motion.div 
        className="w-[85vw] h-[65vh] flex bg-[#111827] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      >
        {/* Table View (Fixed Width) */}
        <div className="w-[55vw] shrink-0 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-white font-medium">Lifecycle Tracker</h3>
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-white/5 rounded-full"></div>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-sm">
                <th className="pb-3 pl-4 font-medium">Account</th>
                <th className="pb-3 font-medium">Current Stage</th>
                <th className="pb-3 font-medium">Time-to-Value</th>
                <th className="pb-3 font-medium">Health Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isActive = (phase >= 3 && i === 1);
                return (
                  <motion.tr 
                    key={i}
                    ref={i === 1 ? target1Ref : null}
                    className={`border-b border-white/5 transition-colors relative ${isActive ? 'bg-emerald-500/10' : ''}`}
                    animate={{ backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
                  >
                    <td className="py-5 pl-4 font-medium text-white">{row.name}</td>
                    <td className="py-5 text-white/80">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${row.stage === 'Onboarding' ? 'bg-yellow-400' : 'bg-blue-400'}`}></div>
                        {row.stage}
                      </div>
                    </td>
                    <td className={`py-5 ${row.ttv.includes('Delayed') ? 'text-red-400' : 'text-white/70'}`}>{row.ttv}</td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs border ${
                        row.status === 'Complete' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                        row.status === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded bg-red-500/20 flex items-center justify-center text-red-400 font-bold">TF</div>
                  <div>
                    <h3 className="text-xl text-white font-bold">TechFlow</h3>
                    <div className="text-white/50 text-xs">Onboarding Stage</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-6">
                  <div className={`pb-2 text-sm font-medium border-b-2 transition-colors ${phase < 5 ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-white/50'}`}>Performance</div>
                  <div ref={target2Ref} className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${phase >= 5 ? 'border-red-400 text-red-400' : 'border-transparent text-white/50 hover:text-white'}`}>Risk Flags</div>
                </div>

                {phase < 5 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-white/50 text-sm mb-2">Implementation Milestone</div>
                      <div className="flex justify-between items-end mb-2">
                        <div className="text-2xl text-yellow-400 font-bold">Stalled</div>
                        <div className="text-white/80 text-sm">Week 6 of 4</div>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                        <div className="bg-yellow-400 w-[60%] h-full rounded-full"></div>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Technical integration blocked on customer IT resources. Executive sponsor has not logged in for 14 days.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                      <div className="flex items-start gap-3">
                        <div className="text-red-400 mt-1">⚠️</div>
                        <div>
                          <div className="text-white font-medium mb-1">Executive Sponsor Churn</div>
                          <div className="text-white/70 text-sm leading-relaxed">System detected key contact "VP of Eng" removed from Okta directory integration 2 days ago.</div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <div className="flex items-start gap-3">
                        <div className="text-yellow-400 mt-1">⏳</div>
                        <div>
                          <div className="text-white font-medium mb-1">Missed Value Date</div>
                          <div className="text-white/70 text-sm leading-relaxed">Expected go-live date passed. Associated $50K expansion opp at risk.</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
