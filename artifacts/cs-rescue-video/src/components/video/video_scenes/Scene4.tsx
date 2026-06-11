import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cursor } from '../Cursor';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Move to finding
      setTimeout(() => setPhase(3), 3000), // Click -> detail
      setTimeout(() => setPhase(4), 5000), // Move to process row
      setTimeout(() => setPhase(5), 6000), // Click -> process detail
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const data = [
    { name: "Support SLA Breaches", impact: "High", team: "Support", trend: "+15% YoY", status: "Investigating" },
    { name: "Onboarding Handoff Delay", impact: "Critical", team: "Sales/CS", trend: "14 days avg", status: "Identified" },
    { name: "QBR Completion Rate", impact: "Medium", team: "CSM", trend: "-5% QoQ", status: "Monitor" },
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
        <h2 className="text-[2vw] text-indigo-400 font-mono tracking-[0.2em] uppercase">Operational Intelligence</h2>
        <h1 className="text-[4vw] font-display font-bold text-white mt-1">
          {phase >= 5 ? "Process Bottlenecks" : phase >= 3 ? "AI-Generated Findings" : "System Insights"}
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
        <span className="text-white/80">Measure value creation post-close.</span>
      </motion.div>

      <motion.div 
        className="absolute bottom-[5vh] right-[5vw] z-50 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-emerald-400 font-bold mr-3">PortCo Narrative</span>
        <span className="text-white/80">Increase expansion revenue.</span>
      </motion.div>

      {/* Main UI Frame */}
      <motion.div 
        className="w-[85vw] h-[65vh] flex bg-[#111827] rounded-xl overflow-hidden shadow-2xl border border-white/10 relative"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      >
        {/* Table View */}
        <div className="flex-1 p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-white font-medium">Cross-System Findings</h3>
            <div className="flex gap-2 text-xs font-mono text-white/40">
              <span>SCAN_ID: 884-X</span>
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-sm">
                <th className="pb-3 pl-4 font-medium">Finding / Bottleneck</th>
                <th className="pb-3 font-medium">Impact Level</th>
                <th className="pb-3 font-medium">Teams Involved</th>
                <th className="pb-3 font-medium">Metric</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const isActive = (phase >= 3 && i === 0 && phase < 5) || (phase >= 5 && i === 1);
                return (
                  <motion.tr 
                    key={i}
                    className={`border-b border-white/5 transition-colors relative ${isActive ? 'bg-indigo-500/10' : ''}`}
                    animate={{ backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent' }}
                  >
                    <td className="py-5 pl-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-xs">✨</div>
                      {row.name}
                    </td>
                    <td className="py-5">
                      <span className={`px-3 py-1 rounded-full text-xs border ${
                        row.impact === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        row.impact === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {row.impact}
                      </span>
                    </td>
                    <td className="py-5 text-white/70">{row.team}</td>
                    <td className="py-5 text-white/50 font-mono text-sm">{row.trend}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drill-down Drawer */}
        <AnimatePresence>
          {(phase >= 3) && (
            <motion.div 
              className="w-[30vw] bg-[#0d131f] border-l border-white/10 p-8 flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs mb-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                AI ANALYSIS COMPLETE
              </div>

              {phase < 5 ? (
                <>
                  <h3 className="text-xl text-white font-bold mb-4">Support SLA Breaches</h3>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      Cross-referencing <span className="text-blue-400 font-mono">Zendesk</span> volume with <span className="text-emerald-400 font-mono">Jira</span> bug resolution times shows a 45% correlation. SLA breaches are isolated to Enterprise accounts facing API integration issues.
                    </p>
                  </div>
                  <div className="mt-4">
                    <div className="text-white/50 text-xs mb-2 uppercase tracking-wider">Root Cause Graph</div>
                    <div className="h-24 flex items-end gap-1">
                      {[2, 3, 5, 8, 12, 18, 25, 30].map((v, i) => (
                        <div key={i} className="flex-1 bg-orange-500/50 rounded-t-sm" style={{ height: `${v}%` }}></div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl text-white font-bold mb-4">Onboarding Handoff Delay</h3>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      Time gap between "Closed Won" in <span className="text-blue-400 font-mono">Salesforce</span> and first kickoff meeting logged in <span className="text-purple-400 font-mono">Gong</span> averages 14 days. Industry benchmark is &lt;3 days.
                    </p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="text-red-400 font-bold mb-1">Impact</div>
                    <div className="text-white/90 text-sm">Delays Time-to-Value. Driving early-stage churn risk in SMB segment.</div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      <Cursor 
        x={
          phase >= 5 ? '45vw' :
          phase >= 4 ? '45vw' :
          phase >= 3 ? '45vw' : 
          phase >= 2 ? '45vw' :
          '50vw'
        }
        y={
          phase >= 5 ? '48vh' : 
          phase >= 4 ? '48vh' :
          phase >= 3 ? '38vh' :
          phase >= 2 ? '38vh' :
          '80vh'
        }
        clicking={phase === 3 || phase === 5}
      />
    </motion.div>
  );
}
