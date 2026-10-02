import React, { useState } from "react";

export default function App() {
  const [view, setView] = useState("dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink font-sans selection:bg-primary/20">
      {/* Navigation */}
      <header className="border-b border-border py-4 px-6 flex items-center justify-between bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-[4px] flex items-center justify-center">
              <svg className="w-4 h-4 text-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="text-lg font-bold tracking-tight">HookLedger</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-muted">
            <button onClick={() => setView("dashboard")} className={view === "dashboard" ? "text-primary underline underline-offset-8 decoration-2" : "hover:text-ink transition-colors"}>Events</button>
            <button onClick={() => setView("dlq")} className={view === "dlq" ? "text-primary underline underline-offset-8 decoration-2" : "hover:text-ink transition-colors"}>Dead Letters</button>
            <button onClick={() => setView("reconcile")} className={view === "reconcile" ? "text-primary underline underline-offset-8 decoration-2" : "hover:text-ink transition-colors"}>Reconcile</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-muted uppercase">Environment</p>
            <p className="text-[10px] font-mono font-bold text-success uppercase tracking-tighter">Production (ReadOnly Preview)</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {view === "dashboard" ? "Incoming Webhooks" : view === "dlq" ? "Dead Letter Queue" : "Reconciliation Runs"}
          </h1>
          <div className="flex gap-3">
            <div className="relative">
              <input type="text" placeholder="Filter by reference..." className="px-3 py-1.5 text-xs bg-surface border border-border rounded-[4px] focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-64" />
            </div>
          </div>
        </div>

        <div className="border border-border bg-surface rounded-[6px] overflow-hidden shadow-none">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bg/30 border-b border-border">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted">Timestamp</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted">Provider ID</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted">Reference</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-muted">Status</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { time: "03:40:12", id: "evt_psk_72910", ref: "TX_RE_9012", status: "processed" },
                { time: "03:38:45", id: "evt_psk_88122", ref: "TX_RE_9011", status: "dead_letter" },
                { time: "03:35:01", id: "evt_psk_99210", ref: "TX_RE_9010", status: "processed" },
                { time: "03:30:19", id: "evt_psk_11202", ref: "TX_RE_9009", status: "pending" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-bg/10 transition-colors">
                  <td className="py-3 px-4 font-mono text-muted">{row.time}</td>
                  <td className="py-3 px-4 font-mono">{row.id}</td>
                  <td className="py-3 px-4 font-mono">{row.ref}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'processed' ? 'bg-success' : (row.status === 'dead_letter' ? 'bg-danger' : 'bg-warning')}`}></span>
                      <span className="capitalize font-medium">{row.status.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[10px] font-bold uppercase hover:text-primary tracking-widest cursor-pointer">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border border-border bg-surface rounded-[6px] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full py-2 bg-primary text-surface text-[10px] font-bold uppercase tracking-widest rounded-[4px] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
                Run Reconciler
              </button>
              <button className="w-full py-2 border border-border text-ink text-[10px] font-bold uppercase tracking-widest rounded-[4px] hover:bg-bg transition-all cursor-pointer">
                Replay DLQ
              </button>
            </div>
          </div>
          
          <div className="md:col-span-2 p-6 border border-border bg-surface rounded-[6px] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Engine Health</h3>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] text-muted uppercase">P95 Ingestion</p>
                <p className="text-xl font-bold font-mono tracking-tighter">1.42ms</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">Success Rate</p>
                <p className="text-xl font-bold font-mono tracking-tighter">99.8%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase">Active Workers</p>
                <p className="text-xl font-bold font-mono tracking-tighter">04</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-4 px-6 text-[10px] text-muted text-center uppercase tracking-widest">
        &copy; 2026 HookLedger Engine · Utilitarian Design Baseline
      </footer>
    </div>
  );
}
